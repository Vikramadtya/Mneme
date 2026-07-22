import chokidar from "chokidar";
import { BrowserWindow } from "electron";
import log from "electron-log/main";
import path from "path";

let watcher: chokidar.FSWatcher | null = null;
let isAppWriting = false;

export function setAppWriting(value: boolean) {
  isAppWriting = value;
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
    if (isAppWriting) {
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
