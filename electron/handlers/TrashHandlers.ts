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

export function registerTrashHandlers(ipcMain: any) {
  typedIpcHandle("db:getTrash", async (_, vaultPath: string) => {
    try {
      const trashDir = path.join(vaultPath, ".trash");
      if (!(await exists(trashDir))) return { success: true, data: [] };
      const files = await fs.readdir(trashDir);
      const trashFiles = files
        .filter((f) => f.endsWith(".md"))
        .map((f) => {
          const stats = fsSync.statSync(path.join(trashDir, f));
          return {
            fileName: f,
            originalName: f.split("_").slice(1).join("_") || f,
            deletedAt: stats.mtime.toISOString(),
            size: stats.size,
          };
        });
      return { success: true, data: trashFiles };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  typedIpcHandle(
    "db:restoreNote",
    async (_, vaultPath: string, fileName: string) => {
      try {
        const trashDir = path.join(vaultPath, ".trash");
        const trashPath = path.join(trashDir, fileName);
        if (!(await exists(trashPath)))
          throw new Error("File not found in trash");

        const docsDir = path.join(vaultPath, "docs");
        const originalName = fileName.split("_").slice(1).join("_") || fileName;
        const restorePath = path.join(docsDir, originalName);

        // If a file with the same name exists, append a timestamp to avoid overwrite
        let finalRestorePath = restorePath;
        if (await exists(restorePath)) {
          finalRestorePath = path.join(
            docsDir,
            `${Date.now()}_${originalName}`,
          );
        }

        await fs.rename(trashPath, finalRestorePath);
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    },
  );

  typedIpcHandle(
    "db:restoreNote",
    async (_, vaultPath: string, fileName: string) => {
      try {
        const trashDir = path.join(vaultPath, ".trash");
        const trashPath = path.join(trashDir, fileName);
        if (!(await exists(trashPath)))
          throw new Error("File not found in trash");

        const docsDir = path.join(vaultPath, "docs");
        const originalName = fileName.split("_").slice(1).join("_") || fileName;
        const restorePath = path.join(docsDir, originalName);

        // If a file with the same name exists, append a timestamp to avoid overwrite
        let finalRestorePath = restorePath;
        if (await exists(restorePath)) {
          finalRestorePath = path.join(
            docsDir,
            `${Date.now()}_${originalName}`,
          );
        }

        await fs.rename(trashPath, finalRestorePath);
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    },
  );

  typedIpcHandle("db:emptyTrash", async (_, vaultPath: string) => {
    try {
      const trashDir = path.join(vaultPath, ".trash");
      if (!(await exists(trashDir))) return { success: true };
      const files = await fs.readdir(trashDir);
      for (const file of files) {
        await fs.unlink(path.join(trashDir, file)).catch(() => {});
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  let isSyncing = false;
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

  typedIpcHandle("db:searchNotes", async (_, query: string) => {
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

  typedIpcHandle("db:logActivity", async (_, date: string, action: string) => {
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

  typedIpcHandle("db:getActivityLogs", async (_) => {
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
  typedIpcHandle("db:getSettings", async (_) => {
    try {
      const rows = await getDb("SELECT key, value FROM settings");
      const settings: Record<string, string> = {};
      const encryptedKeys = [
        "gitGithubToken",
        "openAiKey",
        "anthropicKey",
        "geminiKey",
      ];

      // Load non-encrypted keys from SQLite
      (rows || []).forEach((r) => {
        if (!encryptedKeys.includes(r.key)) {
          settings[r.key] = r.value;
        }
      });

      // Load encrypted keys from electron-store
      encryptedKeys.forEach((key) => {
        const val = store.get(key) as string | undefined;
        if (val) {
          if (safeStorage.isEncryptionAvailable()) {
            try {
              settings[key] = safeStorage.decryptString(
                Buffer.from(val, "base64"),
              );
            } catch (e) {
              console.error(`Failed to decrypt ${key}:`, e);
              // Fallback just in case it was stored unencrypted
              settings[key] = val;
            }
          } else {
            settings[key] = val;
          }
        }
      });

      return { success: true, data: settings };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  typedIpcHandle("db:saveSetting", async (_, key: string, value: string) => {
    const encryptedKeys = [
      "gitGithubToken",
      "openAiKey",
      "anthropicKey",
      "geminiKey",
    ];
    try {
      if (encryptedKeys.includes(key)) {
        let finalValue = value;
        if (safeStorage.isEncryptionAvailable()) {
          finalValue = safeStorage.encryptString(value).toString("base64");
        }
        store.set(key, finalValue);
      } else {
        await runDb(
          "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
          [key, value],
        );
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  typedIpcHandle(
    "db:saveSettings",
    async (_, settings: Record<string, string>) => {
      try {
        await runDb("BEGIN TRANSACTION");
        const encryptedKeys = [
          "gitGithubToken",
          "openAiKey",
          "anthropicKey",
          "geminiKey",
        ];
        for (const [key, value] of Object.entries(settings)) {
          if (encryptedKeys.includes(key)) {
            let finalValue = value;
            if (safeStorage.isEncryptionAvailable()) {
              finalValue = safeStorage.encryptString(value).toString("base64");
            }
            store.set(key, finalValue);
          } else {
            await runDb(
              "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
              [key, value],
            );
          }
        }
        await runDb("COMMIT");
        return { success: true };
      } catch (err: any) {
        await runDb("ROLLBACK").catch(() => {});
        return { success: false, error: err.message };
      }
    },
  );
}
