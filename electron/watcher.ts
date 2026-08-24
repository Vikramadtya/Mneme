import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { getDb } from "./ipcHandlers";

let watcher: fs.FSWatcher | null = null;
let syncTimeout: NodeJS.Timeout | null = null;
let isSyncing = false;

export function setupWatcher(
  vaultPath: string,
  mainWindow: Electron.BrowserWindow,
) {
  if (watcher) {
    watcher.close();
    watcher = null;
  }

  if (!vaultPath || !fs.existsSync(vaultPath)) return;

  try {
    watcher = fs.watch(
      vaultPath,
      { recursive: true },
      (eventType, filename) => {
        if (!filename || filename.startsWith(".") || filename.includes(".git"))
          return;

        if (syncTimeout) clearTimeout(syncTimeout);
        syncTimeout = setTimeout(async () => {
          if (isSyncing) return;
          isSyncing = true;

          try {
            // Tell frontend to refresh
            mainWindow.webContents.send("vault:changed");
          } catch (e) {
            console.error("Watcher sync error:", e);
          } finally {
            isSyncing = false;
          }
        }, 2000);
      },
    );
    console.log("NATIVE FS.WATCH STARTED ON:", vaultPath);
  } catch (e) {
    console.error("FAILED TO START FS.WATCH:", e);
  }
}
export function setAppWriting(isWriting: boolean) {
  // no-op for now, can implement later if needed
}

export function startWatcher() {
  // no-op, setupWatcher handles it
}
