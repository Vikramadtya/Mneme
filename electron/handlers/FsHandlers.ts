import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { exists } from "../ipcHandlers";
import { atomicWrite } from "../utils/atomicWrite";

export function registerFsHandlers(ipcMain: any) {
  ipcMain.handle("fs:readMkdocsConfig", async (_, vaultPath: string) => {
    const homeDir = app.getPath("home");
    if (vaultPath && !vaultPath.startsWith(homeDir)) {
      throw new Error(
        "Security Error: vaultPath is outside allowed directories.",
      );
    }

    try {
      if (!vaultPath) throw new Error("Vault path not set");
      const mkdocsPath = path.join(vaultPath, "mkdocs.yml");
      if (await exists(mkdocsPath)) {
        const data = await fs.readFile(mkdocsPath, "utf-8");
        return { success: true, data };
      }
      return { success: true, data: "" };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    "fs:saveMkdocsConfig",
    async (_, vaultPath: string, content: string) => {
      try {
        if (!vaultPath) throw new Error("Vault path not set");
        const mkdocsPath = path.join(vaultPath, "mkdocs.yml");
        await atomicWrite(mkdocsPath, content, { encoding: "utf-8" });

        // Copy icon to vault for MkDocs
        try {
          const assetsPath = path.join(vaultPath, "docs", "assets");
          await fs.mkdir(assetsPath, { recursive: true });

          let sourceIcon = path.join(app.getAppPath(), "public", "icon.png");
          if (app.isPackaged) {
            sourceIcon = path.join(
              process.resourcesPath,
              "app.asar",
              "dist",
              "icon.png",
            );
          }
          if (await exists(sourceIcon)) {
            await fs.copyFile(sourceIcon, path.join(assetsPath, "logo.png"));
          } else {
            // Fallback to searching dist
            sourceIcon = path.join(app.getAppPath(), "dist", "icon.png");
            if (await exists(sourceIcon)) {
              await fs.copyFile(sourceIcon, path.join(assetsPath, "logo.png"));
            }
          }
        } catch (e) {
          console.error("Failed to copy icon:", e);
        }

        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );
}
