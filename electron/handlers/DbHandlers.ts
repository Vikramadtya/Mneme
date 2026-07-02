import { safeStorage, app } from "electron";
import log from "electron-log/main";
import { atomicWrite } from "../utils/atomicWrite";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { LRUCache } from "lru-cache";
import sharp from "sharp";

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
import { startWatcher, setAppWriting } from "../watcher";
import { BrowserWindow } from "electron";

export function registerDbHandlers(ipcMain: any) {
  ipcMain.handle("db:getInitialState", async (_, vaultPath: string) => {
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
  ipcMain.handle(
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

        if (oldProj && vaultPath) {
          const nameChanged = oldProj.name !== project.name;
          const parentChanged = oldProj.parent_id !== project.parent_id;

          if (nameChanged || parentChanged) {
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
            const oldRelPath = buildPath(
              oldProj.id,
              oldProj.name,
              oldProj.parent_id,
            );
            // Notice: project is already saved in DB above, so projMap has the NEW values!
            // But just in case, we pass overrides
            const newRelPath = buildPath(
              project.id,
              project.name,
              project.parent_id || null,
            );

            const oldPath = path.join(base, oldRelPath);
            const newPath = path.join(base, newRelPath);

            if ((await exists(oldPath)) && oldPath !== newPath) {
              await fs
                .rename(oldPath, newPath)
                .catch((e) => console.error("Rename failed:", e));
            }
          }
        }
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

  // Notes CRUD
  ipcMain.handle(
    "db:getNoteContent",
    async (_, vaultPath: string, noteId: string) => {
      console.log(`[db:getNoteContent] Called for noteId=${noteId}`);
      try {
        const note = await getDb(
          "SELECT title, project_id FROM notes WHERE id = ?",
          [noteId],
        ).then((r) => r[0]);
        if (!note) {
          console.log(`[db:getNoteContent] Note not found in DB`);
          return { success: false, error: "Note not found" };
        }

        const filePath = await resolveNotePath(
          vaultPath,
          note.title,
          note.project_id,
        );
        console.log(`[db:getNoteContent] resolved path=${filePath}`);
        if (await exists(filePath)) {
          const content = await fs.readFile(filePath, "utf-8");
          console.log(
            `[db:getNoteContent] File exists, read ${content.length} bytes`,
          );
          return { success: true, data: content };
        }
        console.log(`[db:getNoteContent] File does not exist`);
        return { success: true, data: "" };
      } catch (error: any) {
        console.error(`[db:getNoteContent] ERROR:`, error);
        return { success: false, error: error.message };
      }
    },
  );

  ipcMain.handle("db:saveNote", async (_, vaultPath: string, note: any) => {
    const homeDir = app.getPath("home");
    if (vaultPath && !vaultPath.startsWith(homeDir)) {
      throw new Error(
        "Security Error: vaultPath is outside allowed directories.",
      );
    }

    try {
      setAppWriting(true);
      await runDb("BEGIN TRANSACTION");
      let oldFilePath: string | null = null;
      let newFilePath: string | null = null;

      const projId = note.chapterId || note.projectId || note.project_id;

      if (vaultPath) {
        const oldNote = await getDb("SELECT * FROM notes WHERE id = ?", [
          note.id,
        ]).then((r) => r[0]);
        if (oldNote) {
          oldFilePath = await resolveNotePath(
            vaultPath,
            oldNote.title,
            oldNote.project_id,
          );
        }
        newFilePath = await resolveNotePath(vaultPath, note.title, projId);
      }

      await runDb(
        "INSERT OR REPLACE INTO notes (id, project_id, title, date, time, tags) VALUES (?, ?, ?, ?, ?, ?)",
        [
          note.id,
          projId,
          note.title,
          note.date,
          note.time,
          JSON.stringify(note.tags || []),
        ],
      );

      if (note.flashcard) {
        await runDb(
          "INSERT OR REPLACE INTO flashcards (id, note_id, question, answer, next_review, interval, ease, repetition) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [
            note.id + "_fc",
            note.id,
            note.flashcard.question,
            note.flashcard.answer,
            note.flashcard.nextReviewDate,
            note.flashcard.interval,
            note.flashcard.easeFactor,
            note.flashcard.repetition,
          ],
        );
      } else {
        await runDb("DELETE FROM flashcards WHERE note_id = ?", [note.id]);
      }

      await runDb("COMMIT");

      if (vaultPath && newFilePath) {
        // Ensure dir exists
        await fs.mkdir(path.dirname(newFilePath), { recursive: true });

        // Rename if title/project changed
        if (oldFilePath && oldFilePath !== newFilePath) {
          if (await exists(oldFilePath)) {
            try {
              let git = gitCache.get(vaultPath);
              if (!git) {
                git = customRequire("simple-git")(vaultPath);
                gitCache.set(vaultPath, git);
              }
              if (await git.checkIsRepo()) {
                const relativeOld = path.relative(vaultPath, oldFilePath);
                const relativeNew = path.relative(vaultPath, newFilePath);
                await git.mv(relativeOld, relativeNew);
                // After git mv, only stage the new path
                await git.commit(`Rename note: ${note.title}`, [relativeNew]);
              } else {
                await fs.rename(oldFilePath, newFilePath).catch(() => {});
              }
            } catch {
              await fs.rename(oldFilePath, newFilePath).catch(() => {});
            }
          }
        }

        if (note.content !== undefined) {
          await atomicWrite(newFilePath, note.content || "", {
            encoding: "utf-8",
          });
          try {
            let git = gitCache.get(vaultPath);
            if (!git) {
              git = customRequire("simple-git")(vaultPath);
              gitCache.set(vaultPath, git);
            }
            if (await git.checkIsRepo()) {
              const relativePath = path.relative(vaultPath, newFilePath);
              await git.add(relativePath);
            }
          } catch (e) {
            console.error("Auto-commit failed:", e);
          }
        }

        let ftsContent = note.content;
        if (ftsContent === undefined) {
          try {
            ftsContent = await fs.readFile(newFilePath, "utf-8");
          } catch (e) {
            ftsContent = "";
          }
        }
        noteContentCache.set(note.id, ftsContent);
        await runDb(
          "INSERT OR REPLACE INTO notes_fts (id, title, content) VALUES (?, ?, ?)",
          [note.id, note.title, ftsContent],
        );
      }

      return { success: true };
    } catch (error: any) {
      await runDb("ROLLBACK").catch(() => {});
      return { success: false, error: error.message };
    } finally {
      setAppWriting(false);
    }
  });

  ipcMain.handle(
    "fs:saveAsset",
    async (
      _,
      vaultPath: string,
      fileName: string,
      buffer: ArrayBuffer,
      projectId?: string,
    ) => {
      try {
        setAppWriting(true);
        if (!vaultPath) throw new Error("Vault path not set");

        let subfolder = "";
        if (projectId) {
          const notePath = await resolveNotePath(vaultPath, "dummy", projectId);
          const docsPath = path.join(vaultPath, "docs");
          const noteDir = path.dirname(notePath);
          subfolder = path.relative(docsPath, noteDir);
        }

        const assetsPath = path.join(
          vaultPath,
          "docs",
          "assets",
          "images",
          subfolder,
        );
        await fs.mkdir(assetsPath, { recursive: true });

        // If it looks like an image based on extension, use sharp to convert to webp
        const ext = path.extname(fileName).toLowerCase();
        let finalFileName = fileName;
        let finalBuffer = Buffer.from(buffer);

        if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) {
          finalFileName = fileName.replace(ext, ".webp");
          finalBuffer = await sharp(finalBuffer)
            .webp({ quality: 82 })
            .toBuffer();
        }

        const filePath = path.join(assetsPath, path.basename(finalFileName));
        await atomicWrite(filePath, finalBuffer);

        const dataPath = subfolder
          ? `${subfolder.replace(/\\/g, "/")}/${finalFileName}`
          : finalFileName;

        let relativeUrl = `../assets/images/${dataPath}`;
        if (projectId) {
          const notePath = await resolveNotePath(vaultPath, "dummy", projectId);
          const noteDir = path.dirname(notePath);
          const relativeToNote = path.relative(noteDir, assetsPath);
          relativeUrl = `${relativeToNote.replace(/\\/g, "/")}/${finalFileName}`;
        }

        return { success: true, data: dataPath, url: relativeUrl };
      } catch (error: any) {
        log.error("fs:saveAsset error:", error);
        return { success: false, error: error.message };
      } finally {
        setAppWriting(false);
      }
    },
  );

  ipcMain.handle(
    "fs:copyPdfAsset",
    async (_, vaultPath: string, sourcePath: string) => {
      try {
        if (!vaultPath) throw new Error("Vault path not set");
        const assetsPath = path.join(vaultPath, "docs", "assets", "books");
        await fs.mkdir(assetsPath, { recursive: true });

        const fileName = path.basename(sourcePath);
        const destPath = path.resolve(assetsPath, fileName);

        // Prevent path traversal
        if (!destPath.startsWith(path.resolve(assetsPath))) {
          throw new Error("Invalid destination path");
        }

        await fs.copyFile(sourcePath, destPath);

        // Return the relative URL for database storage
        const relativeUrl = `assets/books/${fileName}`;
        return { success: true, data: relativeUrl };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

  ipcMain.handle(
    "fs:readNoteContent",
    async (_, vaultPath: string, noteId: string) => {
      try {
        if (!vaultPath) throw new Error("Vault path not set");
        const cached = noteContentCache.get(noteId);
        if (cached) return { success: true, data: cached };

        const note = await getDb("SELECT * FROM notes WHERE id = ?", [
          noteId,
        ]).then((r) => r[0]);
        if (!note) throw new Error("Note not found in DB");
        const filePath = await resolveNotePath(
          vaultPath,
          note.title,
          note.project_id,
        );
        const content = await fs.readFile(filePath, "utf-8");
        noteContentCache.set(noteId, content);
        return { success: true, data: content };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

  ipcMain.handle(
    "db:deleteNote",
    async (_, vaultPath: string, noteId: string) => {
      try {
        setAppWriting(true);
        let filePath: string | null = null;
        if (vaultPath) {
          const note = await getDb("SELECT * FROM notes WHERE id = ?", [
            noteId,
          ]).then((r) => r[0]);
          if (note)
            filePath = await resolveNotePath(
              vaultPath,
              note.title,
              note.project_id,
            );
        }

        await runDb("DELETE FROM notes WHERE id = ?", [noteId]);
        await runDb("DELETE FROM flashcards WHERE note_id = ?", [noteId]);

        if (filePath && (await exists(filePath))) {
          await fs.unlink(filePath).catch(() => {});
        }
        noteContentCache.delete(noteId);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

  let isSyncing = false;
  ipcMain.handle("db:syncFromVault", async (_, vaultPath: string) => {
    const homeDir = app.getPath("home");
    if (vaultPath && !vaultPath.startsWith(homeDir)) {
      throw new Error(
        "Security Error: vaultPath is outside allowed directories.",
      );
    }

    if (isSyncing) return { success: true };
    isSyncing = true;
    try {
      if (!vaultPath) throw new Error("Vault path not set");
      const docsPath = path.join(vaultPath, "docs");

      // Ensure docs exists
      if (!(await exists(docsPath))) return { success: true };

      // Helper to generate IDs
      const genId = () => randomUUID();

      // Read current DB state
      const dbProjects = await getDb("SELECT * FROM projects");
      const dbNotes = await getDb("SELECT * FROM notes");

      const projMap = new Map();
      dbProjects.forEach((p) =>
        projMap.set(`${p.parent_id || "null"}_${p.name}`, p),
      );

      const notesMap = new Map();
      dbNotes.forEach((n) =>
        notesMap.set(`${n.project_id || "null"}_${n.title}`, n),
      );

      // We'll keep track of found items to delete orphaned DB records
      const foundProjectIds = new Set<string>();
      const foundNoteIds = new Set<string>();
      const dbOps: { query: string; params: any[] }[] = [];

      const processFolder = async (
        dirPath: string,
        parentId: string | null = null,
        depth: number = 0,
        forcedType?: "book" | "course",
      ) => {
        const entries = await fs.readdir(dirPath, {
          withFileTypes: true,
        });

        for (const entry of entries) {
          if (entry.name.startsWith(".")) continue; // ignore hidden
          const IGNORED_FOLDERS = [
            "assets",
            "javascript",
            "javascripts",
            "js",
            "css",
            "stylesheets",
            "images",
            "img",
            "overrides",
            "fonts",
          ];
          if (IGNORED_FOLDERS.includes(entry.name.toLowerCase())) continue; // ignore MkDocs asset folders

          const fullPath = path.join(dirPath, entry.name);

          if (entry.isDirectory()) {
            // Ignore the grouping directories at root level and recurse into them treating their contents as root projects
            if (
              depth === 0 &&
              (entry.name === "Books" || entry.name === "Courses")
            ) {
              const passType = entry.name === "Books" ? "book" : "course";
              await processFolder(fullPath, null, 0, passType);
              continue;
            }

            // Find or create project
            let proj = projMap.get(`${parentId || "null"}_${entry.name}`);

            // Determine type
            let projType = forcedType
              ? forcedType
              : depth === 0
                ? "book"
                : "chapter";
            if (depth === 0) {
              const typePath = path.join(fullPath, ".type");
              if (await exists(typePath)) {
                try {
                  const t = await fs.readFile(typePath, "utf-8");
                  if (t.trim().toLowerCase() === "course") {
                    projType = "course";
                  }
                } catch (e) {
                  console.error(e);
                }
              }
            }

            if (!proj) {
              proj = {
                id: genId(),
                name: entry.name,
                type: projType,
                color: null,
                parent_id: parentId,
              };
              dbOps.push({
                query:
                  "INSERT INTO projects (id, name, type, color, parent_id) VALUES (?, ?, ?, ?, ?)",
                params: [
                  proj.id,
                  proj.name,
                  proj.type,
                  proj.color,
                  proj.parent_id,
                ],
              });
              dbProjects.push(proj);
              projMap.set(`${proj.parent_id || "null"}_${proj.name}`, proj);
            } else if (depth === 0 && proj.type !== projType) {
              // Update type if it changed (e.g. user added .type file)
              proj.type = projType;
              dbOps.push({
                query: "UPDATE projects SET type = ? WHERE id = ?",
                params: [projType, proj.id],
              });
            }
            foundProjectIds.add(proj.id);

            await processFolder(fullPath, proj.id, depth + 1);
          }
        }

        // Phase 2: Process files in parallel
        const filePromises = entries
          .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
          .map(async (entry) => {
            const fullPath = path.join(dirPath, entry.name);
            let title = entry.name.slice(0, -3);

            if (title === "index" && parentId) {
              const parentProj = dbProjects.find((p: any) => p.id === parentId);
              if (parentProj) title = parentProj.name;
            }

            // Find or create note
            let note = notesMap.get(`${parentId || "null"}_${title}`);
            if (!note) {
              note = {
                id: genId(),
                project_id: parentId,
                title: title,
                date: new Date().toISOString().split("T")[0],
                time: new Date().toTimeString().substring(0, 5),
                tags: "[]",
              };
              dbOps.push({
                query:
                  "INSERT INTO notes (id, project_id, title, date, time, tags) VALUES (?, ?, ?, ?, ?, ?)",
                params: [
                  note.id,
                  note.project_id,
                  note.title,
                  note.date,
                  note.time,
                  note.tags,
                ],
              });
              dbNotes.push(note);
              notesMap.set(`${note.project_id || "null"}_${note.title}`, note);
            }
            foundNoteIds.add(note.id);

            // FTS5 Indexing
            try {
              const fileContent = await fs.readFile(fullPath, "utf-8");
              dbOps.push({
                query:
                  "INSERT OR REPLACE INTO notes_fts (id, title, content) VALUES (?, ?, ?)",
                params: [note.id, note.title, fileContent],
              });
            } catch (e) {
              console.error(`Failed to index FTS5 for ${title}`, e);
            }
          });

        await Promise.all(filePromises);
      };

      await processFolder(docsPath, null, 0);

      // Delete orphaned DB records
      for (const note of dbNotes) {
        if (!foundNoteIds.has(note.id)) {
          // dbOps.push({ query: "DELETE FROM notes WHERE id = ?", params: [note.id] });
          // dbOps.push({ query: "DELETE FROM flashcards WHERE note_id = ?", params: [note.id] });
        }
      }
      for (const proj of dbProjects) {
        if (!foundProjectIds.has(proj.id)) {
          dbOps.push({
            query: "DELETE FROM projects WHERE id = ?",
            params: [proj.id],
          });
        }
      }

      // Execute all DB ops in a single synchronous transaction!
      const executeTransaction = db.transaction((ops: any[]) => {
        for (const op of ops) {
          db.prepare(op.query).run(...op.params);
        }
      });
      if (dbOps.length > 0) {
        executeTransaction(dbOps);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      isSyncing = false;
    }
  });

  ipcMain.handle("db:searchNotes", async (_, query: string) => {
    try {
      if (!query || query.trim() === "") return { success: true, data: [] };
      // Use FTS5 MATCH with wildcard for partial matches
      const searchQuery = query
        .trim()
        .split(/\s+/)
        .map((term) => term + "*")
        .join(" ");
      const results = await getDb(
        `SELECT notes.*, snippet(notes_fts, 2, '<b>', '</b>', '...', 10) as snippet 
         FROM notes_fts 
         JOIN notes ON notes.id = notes_fts.id 
         WHERE notes_fts MATCH ? 
         ORDER BY rank LIMIT 50`,
        [searchQuery],
      );
      return { success: true, data: results };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("db:logActivity", async (_, date: string, action: string) => {
    const id = date + "_" + action;
    try {
      const rows = await getDb("SELECT count FROM activity_logs WHERE id = ?", [
        id,
      ]);
      if (rows.length > 0) {
        await runDb("UPDATE activity_logs SET count = count + 1 WHERE id = ?", [
          id,
        ]);
      } else {
        await runDb(
          "INSERT INTO activity_logs (id, date, action, count) VALUES (?, ?, ?, 1)",
          [id, date, action],
        );
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("db:getActivityLogs", async (_) => {
    try {
      const rows = await getDb(
        "SELECT date, SUM(count) as count FROM activity_logs GROUP BY date ORDER BY date ASC",
      );
      return { success: true, data: rows || [] };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Settings CRUD
  ipcMain.handle("db:getSettings", async (_) => {
    try {
      const rows = await getDb("SELECT key, value FROM settings");
      const settings: Record<string, string> = {};
      (rows || []).forEach((r) => {
        if (r.key === "gitGithubToken" && safeStorage.isEncryptionAvailable()) {
          try {
            settings[r.key] = safeStorage.decryptString(
              Buffer.from(r.value, "base64"),
            );
          } catch (e) {
            console.error(e);
            settings[r.key] = r.value;
          }
        } else {
          settings[r.key] = r.value;
        }
      });
      return { success: true, data: settings };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("db:saveSetting", async (_, key: string, value: string) => {
    let finalValue = value;
    if (key === "gitGithubToken" && safeStorage.isEncryptionAvailable()) {
      finalValue = safeStorage.encryptString(value).toString("base64");
    }
    try {
      await runDb(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        [key, finalValue],
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(
    "db:saveSettings",
    async (_, settings: Record<string, string>) => {
      try {
        await runDb("BEGIN TRANSACTION");
        for (const [key, value] of Object.entries(settings)) {
          let finalValue = value;
          if (key === "gitGithubToken" && safeStorage.isEncryptionAvailable()) {
            finalValue = safeStorage.encryptString(value).toString("base64");
          }
          await runDb(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
            [key, finalValue],
          );
        }
        await runDb("COMMIT");
        return { success: true };
      } catch (err: any) {
        await runDb("ROLLBACK").catch(() => {});
        return { success: false, error: err.message };
      }
    },
  );

  // GitHub Actions workflow generation
}
