import chokidar from "chokidar";
import { BrowserWindow } from "electron";
import log from "electron-log/main";
import path from "path";

let watcher: chokidar.FSWatcher | null = null;
let writeLockCount = 0;
let lockTimeout: NodeJS.Timeout | null = null;

export function acquireWriteLock() {
  writeLockCount++;
  if (lockTimeout) clearTimeout(lockTimeout);

  // Auto-release lock after 5 seconds to prevent deadlocks
  lockTimeout = setTimeout(() => {
    if (writeLockCount > 0) {
      log.warn("Write lock timeout reached. Forcibly releasing lock.");
      writeLockCount = 0;
    }
  }, 5000);
}

export function releaseWriteLock() {
  if (writeLockCount > 0) {
    writeLockCount--;
  }
  if (writeLockCount === 0 && lockTimeout) {
    clearTimeout(lockTimeout);
    lockTimeout = null;
  }
}

export function setAppWriting(value: boolean) {
  if (value) {
    acquireWriteLock();
  } else {
    releaseWriteLock();
  }
}

export function isAppWritingActive() {
  return writeLockCount > 0;
}

export function startWatcher(vaultPath: string, mainWindow: BrowserWindow) {
  if (watcher) {
    watcher.close();
  }

  watcher = chokidar.watch(vaultPath, {
    ignored: [
      /(^|[\/\\])\../, // ignore hidden files
      "**/docs/assets/**", // ignore assets folder
      "**/.git/**", // ignore git
      "**/.DS_Store",
    ],
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
  });

  const notifyChange = (changedPath: string) => {
    if (isAppWritingActive()) {
      log.info(`App is writing, ignoring watcher event for ${changedPath}`);
      return;
    }

    // Ignore internal mkdocs building files if they slip through
    if (changedPath.includes("site") || changedPath.includes("__pycache__"))
      return;

    log.info(`External change detected: ${changedPath}. Notifying renderer...`);
    mainWindow.webContents.send("vault-file-changed");
  };

  watcher
    .on("add", notifyChange)
    .on("change", notifyChange)
    .on("unlink", notifyChange)
    .on("unlinkDir", notifyChange)
    .on("error", (error) => {
      log.error(`Watcher error: ${error}`);
    });

  log.info(`Started file watcher on ${vaultPath}`);
}
