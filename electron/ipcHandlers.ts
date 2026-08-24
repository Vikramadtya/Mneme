import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

export const customRequire = createRequire(import.meta.url);
const Database = customRequire("better-sqlite3");

export const gitCache = new Map<string, any>();

export async function exists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export const userDataPath = app.getPath("userData");
const dbPath = path.join(userDataPath, "memoriser.db");
export const configPath = path.join(userDataPath, "config.json");
export const db = new Database(dbPath);

import { runMigrations } from "./db/migrations";

export function setupDatabase() {
  // Performance: WAL mode for concurrent reads
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("synchronous = NORMAL");
  db.pragma("cache_size = -64000"); // 64MB cache

  runMigrations(db);
}

export const runDb = (query: string, params: any[] = []): any => {
  const info = db.prepare(query).run(...params);
  return info;
};

export const getDb = (query: string, params: any[] = []): any[] => {
  const rows = db.prepare(query).all(...params);
  return rows;
};

export const sanitize = (name: string) =>
  name.replace(/[<>:"/\\|?*]/g, "").trim();

export const resolveNotePath = async (
  vaultPath: string,
  title: string,
  projectId: string | null,
) => {
  const base = vaultPath;

  const checkPaths = async (dir: string) => {
    const standardPath = path.join(dir, sanitize(title) + ".md");
    const indexPath = path.join(dir, "index.md");
    try {
      await fs.access(standardPath);
      return standardPath;
    } catch {
      try {
        await fs.access(indexPath);
        return indexPath;
      } catch {
        return standardPath; // fallback for new notes
      }
    }
  };

  if (!projectId) return checkPaths(path.join(base, "Uncategorized"));

  const projs = getDb("SELECT * FROM projects WHERE id = ?", [projectId]);
  const proj = projs[0];
  if (!proj) return checkPaths(path.join(base, "Uncategorized"));

  if (proj.parent_id) {
    const parentProjs = getDb("SELECT * FROM projects WHERE id = ?", [
      proj.parent_id,
    ]);
    const parentProj = parentProjs[0];
    const parentTypeDir = parentProj.type === "course" ? "Courses" : "Books";
    return checkPaths(
      path.join(
        base,
        parentTypeDir,
        sanitize(parentProj.name),
        sanitize(proj.name),
      ),
    );
  } else {
    const typeDir = proj.type === "course" ? "Courses" : "Books";
    return checkPaths(path.join(base, typeDir, sanitize(proj.name)));
  }
};

export function registerIpcHandlers() {
  const { registerNoteHandlers } = require("./handlers/NoteHandlers");
  const { registerProjectHandlers } = require("./handlers/ProjectHandlers");
  const { registerTrashHandlers } = require("./handlers/TrashHandlers");
  const { registerSettingsHandlers } = require("./handlers/SettingsHandlers");
  const { registerSyncHandlers } = require("./handlers/SyncHandlers");
  const { registerAppHandlers } = require("./handlers/AppHandlers");
  const { registerFsHandlers } = require("./handlers/FsHandlers");
  const { registerGitHandlers } = require("./handlers/GitHandlers");

  const { ipcMain } = require("electron");

  registerNoteHandlers(ipcMain);
  registerProjectHandlers(ipcMain);
  registerTrashHandlers(ipcMain);
  registerSettingsHandlers(ipcMain);
  registerSyncHandlers(ipcMain);

  registerAppHandlers(ipcMain);
  registerFsHandlers(ipcMain);
  registerGitHandlers(ipcMain);
}
