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
}
