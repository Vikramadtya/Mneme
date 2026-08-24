import { SettingsRepository } from "../db/repositories/SettingsRepository";
import { ProjectRepository } from "../db/repositories/ProjectRepository";
import { NoteRepository } from "../db/repositories/NoteRepository";
import { dialog, app, shell } from "electron";
import { typedIpcHandle } from "../typedIpc";
import fs from "node:fs/promises";
import path from "node:path";

import { atomicWrite } from "../utils/atomicWrite";
import Store from "electron-store";
import AdmZip from "adm-zip";

export const store = new Store();

export function registerAppHandlers(ipcMain: any) {
  typedIpcHandle("db:exportVaultZip", async (_, vaultPath: string) => {
    const result = await dialog.showSaveDialog({
      title: "Export Vault",
      defaultPath: "vault-export.zip",
      filters: [{ name: "ZIP Archives", extensions: ["zip"] }],
    });

    if (result.canceled || !result.filePath) {
      return { success: false, error: "Export canceled" };
    }

    try {
      const zip = new AdmZip();
      zip.addLocalFolder(vaultPath);
      zip.writeZip(result.filePath);
      return { success: true, data: { filePath: result.filePath } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
  typedIpcHandle("app:getConfig", async () => {
    try {
      return { success: true, data: store.store };
    } catch {
      return { success: true, data: {} };
    }
  });

  typedIpcHandle("app:setConfig", async (_, config: any) => {
    try {
      store.set(config);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  typedIpcHandle("app:selectPdf", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "PDF Documents", extensions: ["pdf"] }],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, data: result.filePaths[0] };
    }
    return { success: false };
  });

  typedIpcHandle("app:selectVault", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const vaultDir = result.filePaths[0];
      try {
        const hasMarker = await fs
          .access(path.join(vaultDir, ".memoriser"))
          .then(() => true)
          .catch(() => false);

        if (!hasMarker) {
          // Empty directory or uninitialized vault, copy from template folder
          const templateDir = app.isPackaged
            ? path.join(process.resourcesPath, "vault-template")
            : path.join(app.getAppPath(), "vault-template");

          await fs.cp(templateDir, vaultDir, { recursive: true });
          console.log(`Vault initialized from template at ${templateDir}`);

          // Create marker file for future detection
          await fs.writeFile(path.join(vaultDir, ".memoriser"), "");

          // Create default .gitignore
          await fs.writeFile(
            path.join(vaultDir, ".gitignore"),
            "node_modules/\n.DS_Store\nassets/books/\nassets/images/\n",
          );
        }
      } catch (e) {
        console.error("Error initializing vault:", e);
      }

      return { success: true, data: vaultDir };
    }
    return { success: false };
  });

  typedIpcHandle("app:openExternal", async (_, url: string) => {
    try {
      // Validate URL is safe (only http/https allowed)
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return { success: false, error: "Invalid protocol" };
      }
      await shell.openExternal(url);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // DB Sync State
  // DB Sync State

  // Git Handlers
  typedIpcHandle("app:reportError", async (_, errorInfo: any) => {
    console.error("[Frontend Error]", errorInfo);
  });

  typedIpcHandle("app:log", async (_, level: string, ...args: any[]) => {
    switch (level) {
      case "error":
        console.error("[Frontend ERROR]", ...args);
        break;
      case "warn":
        log.warn("[Frontend WARN]", ...args);
        break;
      default:
        console.log("[Frontend LOG]", ...args);
        break;
    }
  });
}
