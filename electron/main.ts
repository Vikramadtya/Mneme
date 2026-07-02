import "./polyfill";
import { app, BrowserWindow } from "electron";
import path from "node:path";
import { setupDatabase, registerIpcHandlers } from "./ipcHandlers";
import { autoUpdater } from "electron-updater";
import log from "electron-log/main";

log.initialize();
Object.assign(console, log.functions);

process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - SystemJS only
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;
app.commandLine.appendSwitch("js-flags", "--max-old-space-size=512");
app.commandLine.appendSwitch("enable-smooth-scrolling");

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    backgroundColor: "#0f172a",
    titleBarStyle: "hiddenInset",
    icon: path.join(process.env.VITE_PUBLIC, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: !VITE_DEV_SERVER_URL,
    },
  });

  win.once("ready-to-show", () => {
    win?.show();
  });

  if (process.platform === "darwin") {
    app.dock.setIcon(path.join(process.env.VITE_PUBLIC, "icon.png"));
  }

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  setupDatabase();
  registerIpcHandlers();
  createWindow();

  if (!VITE_DEV_SERVER_URL) {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      log.error("Auto updater error:", err);
    });
  }
});
