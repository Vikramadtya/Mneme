import { safeStorage, app } from "electron";
import { typedIpcHandle } from "../typedIpc";

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

let isSyncing = false;

export function registerSyncHandlers(ipcMain: any) {
  typedIpcHandle("db:syncFromVault", async (_, vaultPath: string) => {
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
      const docsPath = vaultPath;

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
            "node_modules",
            "javascript",
            "javascripts",
            "js",
            "css",
            "stylesheets",
            "images",
            "img",
            "overrides",
            "fonts",
            "dist",
            "build",
            "coverage",
            "venv",
            ".venv",
            "env",
            "out",
            "target",
            ".next",
            ".svelte-kit",
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
          // Yield to event loop to prevent blocking the main thread during massive folder scans
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        // Phase 2: Process files sequentially to avoid EMFILE (file descriptor exhaustion)
        const filesToProcess = entries.filter(
          (entry) => entry.isFile() && entry.name.endsWith(".md"),
        );
        for (const entry of filesToProcess) {
          const fullPath = path.join(dirPath, entry.name);
          let title = entry.name.slice(0, -3);

          if (title === "index" && parentId) {
            const parentProj = dbProjects.find((p: any) => p.id === parentId);
            if (parentProj) title = parentProj.name;
          }

          // Find or create note
          let isNewNote = false;
          let note = notesMap.get(`${parentId || "null"}_${title}`);
          if (!note) {
            isNewNote = true;
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

          // FTS5 Indexing ONLY for new notes during sync to avoid massive freezes
          if (isNewNote) {
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
          }
        }
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
}
