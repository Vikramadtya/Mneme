import { SettingsRepository } from "../db/repositories/SettingsRepository";
import { ProjectRepository } from "../db/repositories/ProjectRepository";
import { NoteRepository } from "../db/repositories/NoteRepository";
import { safeStorage, app } from "electron";
import { typedIpcHandle } from "../typedIpc";

import { atomicWrite } from "../utils/atomicWrite";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { LRUCache } from "lru-cache";
import { ProjectSchema } from "../validators/models";

const noteContentCache = new LRUCache<string, string>({ max: 100 });
import {
  sanitize,
  exists,
  resolveNotePath,
  customRequire,
  gitCache,
  runDb,
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
      let projects = await ProjectRepository.getAllProjects();
      const notes = await NoteRepository.getAllNotes();
      const flashcards = await NoteRepository.getAllFlashcards();

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
        await ProjectRepository.deleteProject(buggy.id);
      }
      if (buggyRootFolders.length > 0) {
        projects = await ProjectRepository.getAllProjects(); // Reload after rescue
      }
      // -- MIGRATION START --
      // Migrate existing root projects to Books/ or Courses/
      const baseDocs = vaultPath;
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
          favourite: Boolean(note.favourite),
          sort_order: note.sort_order || 0,
          chapterId: note.project_id,
          ai_summary: note.ai_summary || undefined,
          ai_summary_hash: note.ai_summary_hash || undefined,
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
        // Defer watcher initialization to prevent blocking the UI thread and freezing React
        setTimeout(() => {
          startWatcher(vaultPath, win);
        }, 1000);
      }

      return { success: true, data: { projects: rootProjects, allNotesMap } };
    } catch (error: any) {
      console.error("[getInitialState error]", error);
      return { success: false, error: error.message };
    }
  });

  // Projects CRUD
  typedIpcHandle(
    "db:saveProject",
    async (_, vaultPath: string, rawProject: any) => {
      try {
        const project = ProjectSchema.parse(rawProject);

        // Build map for old state
        const allProjects = await ProjectRepository.getAllProjects();
        const projMap = allProjects.reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});

        function buildPath(pObj: any, map: any): string {
          if (!pObj) return "";
          if (!pObj.parent_id) {
            const typeDir = pObj.type === "course" ? "Courses" : "Books";
            return path.join(typeDir, sanitize(pObj.name));
          }
          const parent = map[pObj.parent_id];
          return path.join(buildPath(parent, map), sanitize(pObj.name));
        }

        const oldProj = projMap[project.id];
        let oldPath = "";
        if (oldProj) {
          oldPath = path.join(vaultPath, buildPath(oldProj, projMap));
        }

        // Save to DB
        await ProjectRepository.saveProject(project);

        // Compute new path
        projMap[project.id] = project;
        const newPath = path.join(vaultPath, buildPath(project, projMap));

        // File system operations
        if (oldProj && oldPath && oldPath !== newPath) {
          if (await exists(oldPath)) {
            await fs.mkdir(path.dirname(newPath), { recursive: true });
            await fs
              .rename(oldPath, newPath)
              .catch((e) => console.error("Rename failed", e));
          } else {
            // old path didn't exist, just create new
            await fs.mkdir(newPath, { recursive: true });
          }
        } else if (!oldProj || !(await exists(newPath))) {
          // New project or missing folder
          await fs.mkdir(newPath, { recursive: true });
        }

        return { success: true };
      } catch (error: any) {
        console.error("[getInitialState error]", error);
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
        console.error("[getInitialState error]", error);
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
        const allProjects = await ProjectRepository.getAllProjects();
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

        const base = vaultPath;
        const relPath = buildPath(projectId);

        // We will cascade delete projects, their chapters, and their notes.
        // First delete notes associated with chapters of this project
        await runDb(
          "DELETE FROM notes WHERE project_id IN (SELECT id FROM projects WHERE parent_id = ?)",
          [projectId],
        );
        // Delete chapters
        await ProjectRepository.deleteProjectsByParentId(projectId);
        // Finally delete the project itself
        await ProjectRepository.deleteProject(projectId);

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
        console.error("[getInitialState error]", error);
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
        const allProjects = await ProjectRepository.getAllProjects();
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

        const base = vaultPath;
        const relPath = buildPath(chapterId);

        // Delete notes associated with this chapter
        await NoteRepository.deleteNotesByChapterId(chapterId);
        // Delete the chapter
        await ProjectRepository.deleteProject(chapterId);

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
        console.error("[getInitialState error]", error);
        return { success: false, error: error.message };
      }
    },
  );
}
