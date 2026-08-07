import { safeStorage, app } from "electron";
import { typedIpcHandle } from "../typedIpc";
import log from "electron-log/main";
import { atomicWrite } from "../utils/atomicWrite";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { LRUCache } from "lru-cache";

const noteContentCache = new LRUCache<string, string>({ max: 100 });
import {
  getDb,
  runDb,
  sanitize,
  exists,
  resolveNotePath,
  customRequire,
  gitCache,
  db,
} from "../ipcHandlers";

const sharp = customRequire("sharp");
import { startWatcher, setAppWriting } from "../watcher";
import { BrowserWindow } from "electron";
import { store } from "./AppHandlers";

export function registerProjectHandlers(ipcMain: any) {
  typedIpcHandle("db:getInitialState", async (_, vaultPath: string) => {
    const homeDir = app.getPath("home");
    if (vaultPath && !vaultPath.startsWith(homeDir)) {
      throw new Error(
        "Security Error: vaultPath is outside allowed directories.",
      );
    }

    try {
      let projects = await getDb("SELECT * FROM projects");
      const notes = await getDb("SELECT * FROM notes");
      const flashcards = await getDb("SELECT * FROM flashcards");

      // -- BUGFIX: RESCUE PROJECTS MISTAKENLY ASSIGNED TO "Books" or "Courses" --
      const buggyRootFolders = projects.filter(
        (p: any) =>
          !p.parent_id && (p.name === "Books" || p.name === "Courses"),
      );
      for (const buggy of buggyRootFolders) {
        await runDb(
          "UPDATE projects SET parent_id = NULL WHERE parent_id = ?",
          [buggy.id],
        );
        await runDb("DELETE FROM projects WHERE id = ?", [buggy.id]);
      }
      if (buggyRootFolders.length > 0) {
        projects = await getDb("SELECT * FROM projects"); // Reload after rescue
      }
      // -- MIGRATION START --
      // Migrate existing root projects to Books/ or Courses/
      const baseDocs = path.join(vaultPath, "docs");
      for (const p of projects.filter((p) => !p.parent_id)) {
        const typeDir = p.type === "course" ? "Courses" : "Books";
        const oldPath = path.join(baseDocs, sanitize(p.name));
        const newPath = path.join(baseDocs, typeDir, sanitize(p.name));

        try {
          const oldStats = await fs.stat(oldPath);
          if (oldStats.isDirectory()) {
            await fs.mkdir(path.join(baseDocs, typeDir), { recursive: true });
            await fs.rename(oldPath, newPath);
            console.log(`Migrated ${p.name} to ${typeDir}/`);
          }
        } catch (e) {
          // Ignore if oldPath doesn't exist
        }
      }
      // -- MIGRATION END --

      // Transform flat DB rows into nested React state structure
      const rootProjects = projects
        .filter((p) => !p.parent_id)
        .map((p) => ({
          ...p,
          chapters: projects.filter((c) => c.parent_id === p.id),
        }));

      const allNotesMap: Record<string, any[]> = {};

      // Optimize flashcard lookups (O(N) instead of O(N*M))
      const flashcardsMap = new Map();
      for (const fc of flashcards) {
        flashcardsMap.set(fc.note_id, fc);
      }

      for (const note of notes) {
        let content = ""; // Content will be lazy-loaded

        const fc = flashcardsMap.get(note.id);
        let parsedTags = [];
        try {
          parsedTags = note.tags ? JSON.parse(note.tags) : [];
        } catch (e) {
          console.error(e);
        }

        const fullNote = {
          ...note,
          content,
          tags: parsedTags,
          chapterId: note.project_id,
          ai_summary: note.ai_summary,
          ai_summary_hash: note.ai_summary_hash,
          flashcard: fc
            ? {
                question: fc.question,
                answer: fc.answer,
                nextReviewDate: fc.next_review,
                interval: fc.interval,
                easeFactor: fc.ease,
                repetition: fc.repetition,
              }
            : undefined,
        };

        if (!allNotesMap[note.project_id]) allNotesMap[note.project_id] = [];
        allNotesMap[note.project_id].push(fullNote);
      }

      const win = BrowserWindow.getAllWindows()[0];
      if (win) {
        startWatcher(vaultPath, win);
      }

      return { success: true, data: { projects: rootProjects, allNotesMap } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Projects CRUD
  typedIpcHandle(
    "db:saveProject",
    async (_, vaultPath: string, project: any) => {
      try {
        // Find old project to handle rename
        const oldProj = await getDb("SELECT * FROM projects WHERE id = ?", [
          project.id,
        ]).then((r) => r[0]);

        await runDb(
          "INSERT OR REPLACE INTO projects (id, name, type, color, parent_id, author, url, pdf_path, instructor, platform) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            project.id,
            project.name,
            project.type,
            project.color,
            project.parent_id || null,
            project.author || null,
            project.url || null,
            project.pdf_path || null,
            project.instructor || null,
            project.platform || null,
          ],
        );

        if (vaultPath) {
          const allProjects = await getDb("SELECT * FROM projects");
          const projMap = allProjects.reduce((acc: any, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {});

          function buildPath(
            id: string,
            overrideName?: string,
            overrideParentId?: string | null,
          ): string {
            const p = projMap[id];
            if (!p) return "";
            const name = overrideName !== undefined ? overrideName : p.name;
            const parentId =
              overrideParentId !== undefined ? overrideParentId : p.parent_id;
            if (!parentId) {
              const typeDir = p.type === "course" ? "Courses" : "Books";
              return path.join(typeDir, sanitize(name));
            }
            return path.join(buildPath(parentId), sanitize(name));
          }

          const base = path.join(vaultPath, "docs");
          const newRelPath = buildPath(
            project.id,
            project.name,
            project.parent_id || null,
          );
          const newPath = path.join(base, newRelPath);

          if (oldProj) {
            const nameChanged = oldProj.name !== project.name;
            const parentChanged = oldProj.parent_id !== project.parent_id;

            if (nameChanged || parentChanged) {
              const oldRelPath = buildPath(
                oldProj.id,
                oldProj.name,
                oldProj.parent_id,
              );
              const oldPath = path.join(base, oldRelPath);

              if ((await exists(oldPath)) && oldPath !== newPath) {
                await fs
                  .rename(oldPath, newPath)
                  .catch((e) => console.error("Rename failed:", e));
              }
            }
          } else {
            // New project: create the directory
            if (!(await exists(newPath))) {
              await fs
                .mkdir(newPath, { recursive: true })
                .catch((e) => console.error("Mkdir failed:", e));
            }
          }
        }
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

  // Projects CRUD
  typedIpcHandle(
    "db:saveProject",
    async (_, vaultPath: string, project: any) => {
      try {
        // Find old project to handle rename
        const oldProj = await getDb("SELECT * FROM projects WHERE id = ?", [
          project.id,
        ]).then((r) => r[0]);

        await runDb(
          "INSERT OR REPLACE INTO projects (id, name, type, color, parent_id, author, url, pdf_path, instructor, platform) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            project.id,
            project.name,
            project.type,
            project.color,
            project.parent_id || null,
            project.author || null,
            project.url || null,
            project.pdf_path || null,
            project.instructor || null,
            project.platform || null,
          ],
        );

        if (vaultPath) {
          const allProjects = await getDb("SELECT * FROM projects");
          const projMap = allProjects.reduce((acc: any, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {});

          function buildPath(
            id: string,
            overrideName?: string,
            overrideParentId?: string | null,
          ): string {
            const p = projMap[id];
            if (!p) return "";
            const name = overrideName !== undefined ? overrideName : p.name;
            const parentId =
              overrideParentId !== undefined ? overrideParentId : p.parent_id;
            if (!parentId) {
              const typeDir = p.type === "course" ? "Courses" : "Books";
              return path.join(typeDir, sanitize(name));
            }
            return path.join(buildPath(parentId), sanitize(name));
          }

          const base = path.join(vaultPath, "docs");
          const newRelPath = buildPath(
            project.id,
            project.name,
            project.parent_id || null,
          );
          const newPath = path.join(base, newRelPath);

          if (oldProj) {
            const nameChanged = oldProj.name !== project.name;
            const parentChanged = oldProj.parent_id !== project.parent_id;

            if (nameChanged || parentChanged) {
              const oldRelPath = buildPath(
                oldProj.id,
                oldProj.name,
                oldProj.parent_id,
              );
              const oldPath = path.join(base, oldRelPath);

              if ((await exists(oldPath)) && oldPath !== newPath) {
                await fs
                  .rename(oldPath, newPath)
                  .catch((e) => console.error("Rename failed:", e));
              }
            }
          } else {
            // New project: create the directory
            if (!(await exists(newPath))) {
              await fs
                .mkdir(newPath, { recursive: true })
                .catch((e) => console.error("Mkdir failed:", e));
            }
          }
        }
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

  typedIpcHandle(
    "db:archiveProject",
    async (_, vaultPath: string, projectId: string) => {
      try {
        if (!vaultPath) throw new Error("Vault path not set");
        await runDb("UPDATE projects SET is_archived = 1 WHERE id = ?", [
          projectId,
        ]);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

  typedIpcHandle(
    "db:unarchiveProject",
    async (_, vaultPath: string, projectId: string) => {
      try {
        if (!vaultPath) throw new Error("Vault path not set");
        await runDb("UPDATE projects SET is_archived = 0 WHERE id = ?", [
          projectId,
        ]);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

  typedIpcHandle(
    "db:deleteProject",
    async (_, vaultPath: string, projectId: string) => {
      try {
        if (!vaultPath) throw new Error("Vault path not set");

        // Compute path before deleting from DB
        const allProjects = await getDb("SELECT * FROM projects");
        const projMap = allProjects.reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});

        function buildPath(id: string): string {
          const p = projMap[id];
          if (!p) return "";
          if (!p.parent_id) {
            const typeDir = p.type === "course" ? "Courses" : "Books";
            return path.join(typeDir, sanitize(p.name));
          }
          return path.join(buildPath(p.parent_id), sanitize(p.name));
        }

        const base = path.join(vaultPath, "docs");
        const relPath = buildPath(projectId);

        // We will cascade delete projects, their chapters, and their notes.
        // First delete notes associated with chapters of this project
        await runDb(
          "DELETE FROM notes WHERE project_id IN (SELECT id FROM projects WHERE parent_id = ?)",
          [projectId],
        );
        // Delete chapters
        await runDb("DELETE FROM projects WHERE parent_id = ?", [projectId]);
        // Finally delete the project itself
        await runDb("DELETE FROM projects WHERE id = ?", [projectId]);

        // Delete from file system
        if (relPath) {
          const fullPath = path.join(base, relPath);
          if (await exists(fullPath)) {
            await fs
              .rm(fullPath, { recursive: true, force: true })
              .catch((e: any) => console.error("RM failed:", e));
          }
        }

        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

  typedIpcHandle(
    "db:deleteChapter",
    async (_, vaultPath: string, chapterId: string) => {
      try {
        if (!vaultPath) throw new Error("Vault path not set");

        // Compute path before deleting from DB
        const allProjects = await getDb("SELECT * FROM projects");
        const projMap = allProjects.reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});

        function buildPath(id: string): string {
          const p = projMap[id];
          if (!p) return "";
          if (!p.parent_id) {
            const typeDir = p.type === "course" ? "Courses" : "Books";
            return path.join(typeDir, sanitize(p.name));
          }
          return path.join(buildPath(p.parent_id), sanitize(p.name));
        }

        const base = path.join(vaultPath, "docs");
        const relPath = buildPath(chapterId);

        // Delete notes associated with this chapter
        await runDb("DELETE FROM notes WHERE project_id = ?", [chapterId]);
        // Delete the chapter
        await runDb("DELETE FROM projects WHERE id = ?", [chapterId]);

        // Delete from file system
        if (relPath) {
          const fullPath = path.join(base, relPath);
          if (await exists(fullPath)) {
            await fs
              .rm(fullPath, { recursive: true, force: true })
              .catch((e: any) => console.error("RM failed:", e));
          }
        }

        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );
}
