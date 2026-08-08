import { dialog, app, shell } from "electron";
import { typedIpcHandle } from "../typedIpc";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { getDb } from "../ipcHandlers";
import { atomicWrite } from "../utils/atomicWrite";
import Store from "electron-store";
import AdmZip from "adm-zip";
import type { ChildProcess } from "node:child_process";

export const store = new Store();
let mkdocsProcess: ChildProcess | null = null;

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
      const mkdocsPath = path.join(vaultDir, "mkdocs.yml");

      try {
        await fs.access(mkdocsPath);
      } catch {
        // Does not exist, copy from template folder
        const templateDir = app.isPackaged
          ? path.join(process.resourcesPath, "vault-template")
          : path.join(app.getAppPath(), "vault-template");

        await fs.cp(templateDir, vaultDir, { recursive: true });
        console.log(`Vault initialized from template at ${templateDir}`);
      }

      return { success: true, data: vaultDir };
    }
    return { success: false };
  });

  typedIpcHandle(
    "app:toggleLive",
    async (_, vaultPath: string, port?: number) => {
      const homeDir = app.getPath("home");
      if (vaultPath && !vaultPath.startsWith(homeDir)) {
        throw new Error(
          "Security Error: vaultPath is outside allowed directories.",
        );
      }

      try {
        if (mkdocsProcess) {
          mkdocsProcess.kill("SIGTERM");
          mkdocsProcess = null;
          return { success: true, data: { active: false } };
        } else {
          if (!vaultPath) throw new Error("Vault path is not set.");

          // Read configured port from settings, fallback to param, then 8000
          let livePort = port || 8000;
          try {
            const rows = (await getDb(
              "SELECT value FROM settings WHERE key = 'mkdocsPort'",
              [],
            )) as { value: string }[];
            if (rows && rows.length > 0 && rows[0].value) {
              livePort = parseInt(rows[0].value, 10) || 8000;
            }
          } catch {
            /* use default */
          }

          try {
            const templateDir = app.isPackaged
              ? path.join(process.resourcesPath, "vault-template")
              : path.join(app.getAppPath(), "vault-template");
            await fs.cp(
              path.join(templateDir, "overrides"),
              path.join(vaultPath, "overrides"),
              { recursive: true, force: false },
            );
          } catch (e) {
            console.error("Failed to copy overrides:", e);
          }

          mkdocsProcess = spawn(
            "python3",
            ["-m", "mkdocs", "serve", "--dev-addr", `127.0.0.1:${livePort}`],
            {
              cwd: vaultPath,
              env: {
                ...process.env,
                PATH:
                  (process.env.PATH || "/usr/local/bin:/usr/bin:/bin") +
                  ":/opt/homebrew/bin:/Users/vikramadityasingh/.local/bin:/Users/vikramadityasingh/Library/Python/3.9/bin",
              },
            },
          );

          const logPath = path.join(vaultPath, "mkdocs.log");
          mkdocsProcess.stdout?.on("data", (data) => {
            fs.appendFile(logPath, data.toString()).catch(() => {});
          });
          mkdocsProcess.stderr?.on("data", (data) => {
            fs.appendFile(logPath, data.toString()).catch(() => {});
          });

          mkdocsProcess.on("error", (err) => {
            console.error("Failed to start mkdocs:", err);
            fs.appendFile(logPath, `ERROR: ${err.message}\n`).catch(() => {});
            mkdocsProcess = null;
          });

          mkdocsProcess.on("exit", (code) => {
            console.log("MkDocs exited with code", code);
            fs.appendFile(logPath, `EXIT: ${code}\n`).catch(() => {});
            mkdocsProcess = null;
          });

          return {
            success: true,
            data: { active: true, url: `http://127.0.0.1:${livePort}` },
          };
        }
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

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
  typedIpcHandle("app:generateGithubAction", async (_, vaultPath: string) => {
    const homeDir = app.getPath("home");
    if (vaultPath && !vaultPath.startsWith(homeDir)) {
      throw new Error(
        "Security Error: vaultPath is outside allowed directories.",
      );
    }

    try {
      const workflowDir = path.join(vaultPath, ".github", "workflows");
      await fs.mkdir(workflowDir, { recursive: true });
      const workflowContent = `name: Deploy MkDocs to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: 3.x
      - run: echo "cache_id=$(date --utc '+%V')" >> $GITHUB_ENV 
      - uses: actions/cache@v4
        with:
          key: mkdocs-material-\${{ env.cache_id }}
          path: .cache
          restore-keys: |
            mkdocs-material-
      - run: pip install mkdocs-material mkdocs-rss-plugin
      - run: mkdocs gh-deploy --force
`;
      await atomicWrite(path.join(workflowDir, "mkdocs.yml"), workflowContent, {
        encoding: "utf-8",
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Git Handlers
  typedIpcHandle("app:reportError", async (_, errorInfo: any) => {
    console.error("Frontend Error Reported:", errorInfo);
  });
}
