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

export function registerNoteHandlers(ipcMain: any) {
  // Notes CRUD
  typedIpcHandle(
    "db:getNoteContent",
    async (_, vaultPath: string, noteId: string) => {
      try {
        const notesResult = getDb(
          "SELECT title, project_id FROM notes WHERE id = ?",
          [noteId],
        );
        const note = notesResult[0];
        if (!note) {
          return { success: false, error: "Note not found" };
        }

        const filePath = await resolveNotePath(
          vaultPath,
          note.title,
          note.project_id,
        );
        if (await exists(filePath)) {
          const content = await fs.readFile(filePath, "utf-8");
          return { success: true, data: content };
        }
        return { success: true, data: "" };
      } catch (error: any) {
        console.error(`[db:getNoteContent] ERROR:`, error);
        return { success: false, error: error.message };
      }
    },
  );

  typedIpcHandle(
    "db:saveNote",
    async (
      _,
      vaultPath: string,
      note: any,
      isExplicitCommit: boolean = false,
    ) => {
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
          ])[0];
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
          "INSERT OR REPLACE INTO notes (id, project_id, title, date, time, tags, ai_summary, ai_summary_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [
            note.id,
            projId,
            note.title,
            note.date,
            note.time,
            JSON.stringify(note.tags || []),
            note.ai_summary || null,
            note.ai_summary_hash || null,
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
            let finalContent = note.content || "";
            try {
              const settingRow = await getDb(
                "SELECT value FROM settings WHERE key = 'autoFormatOnSave'",
              )[0];
              if (settingRow && settingRow.value === "true") {
                const prettier = customRequire("prettier");
                finalContent = await prettier.format(finalContent, {
                  parser: "markdown",
                });
              }
            } catch (e) {
              console.error("Prettier formatting failed", e);
            }
            (note as any).finalContentToReturn = finalContent;
            await atomicWrite(newFilePath, finalContent, {
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
                if (isExplicitCommit) {
                  await git.commit(`Update note: ${note.title}`, [
                    relativePath,
                  ]);
                }
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

        return {
          success: true,
          formattedContent:
            note.content !== undefined
              ? (note as any).finalContentToReturn
              : undefined,
        };
      } catch (error: any) {
        console.error("[db:saveNote] ERROR:", error);
        await runDb("ROLLBACK").catch(() => {});
        return { success: false, error: error.message };
      } finally {
        setAppWriting(false);
      }
    },
  );

  typedIpcHandle(
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

  typedIpcHandle(
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

  typedIpcHandle(
    "fs:readNoteContent",
    async (_, vaultPath: string, noteId: string) => {
      try {
        if (!vaultPath) throw new Error("Vault path not set");
        const cached = noteContentCache.get(noteId);
        if (cached) return { success: true, data: cached };

        const note = await getDb("SELECT * FROM notes WHERE id = ?", [
          noteId,
        ])[0];
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

  typedIpcHandle(
    "db:deleteNote",
    async (_, vaultPath: string, noteId: string) => {
      try {
        setAppWriting(true);
        let filePath: string | null = null;
        if (vaultPath) {
          const note = await getDb("SELECT * FROM notes WHERE id = ?", [
            noteId,
          ])[0];
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
          const trashDir = path.join(vaultPath, ".trash");
          if (!(await exists(trashDir))) {
            await fs.mkdir(trashDir, { recursive: true });
          }
          const fileName = path.basename(filePath);
          const trashPath = path.join(trashDir, `${Date.now()}_${fileName}`);
          await fs.rename(filePath, trashPath);
        }
        noteContentCache.delete(noteId);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

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
}
