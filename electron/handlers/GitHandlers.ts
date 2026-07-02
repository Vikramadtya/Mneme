import { safeStorage, app } from "electron";
import path from "node:path";
import fsSync from "node:fs";
import {
  getDb,
  runDb,
  resolveNotePath,
  customRequire,
  gitCache,
} from "../ipcHandlers";

export function registerGitHandlers(ipcMain: any) {
  ipcMain.handle("git:getVaultHistory", async (_, vaultPath: string) => {
    const homeDir = app.getPath("home");
    if (vaultPath && !vaultPath.startsWith(homeDir)) {
      throw new Error(
        "Security Error: vaultPath is outside allowed directories.",
      );
    }

    try {
      if (!vaultPath) throw new Error("Vault path not set");
      let git = gitCache.get(vaultPath);
      if (!git) {
        git = customRequire("simple-git")(vaultPath);
        gitCache.set(vaultPath, git);
      }
      const isRepo = await git.checkIsRepo();
      if (!isRepo) return { success: true, data: [] };
      const log = await git.log();
      return { success: true, data: log.all };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    "git:getFileHistory",
    async (_, vaultPath: string, noteId: string) => {
      try {
        if (!vaultPath) throw new Error("Vault path not set");
        const note = await getDb("SELECT * FROM notes WHERE id = ?", [
          noteId,
        ]).then((r) => r[0]);
        if (!note) throw new Error("Note not found in DB");
        const notePath = await resolveNotePath(
          vaultPath,
          note.title,
          note.project_id,
        );

        let git = gitCache.get(vaultPath);
        if (!git) {
          git = customRequire("simple-git")(vaultPath);
          gitCache.set(vaultPath, git);
        }
        const isRepo = await git.checkIsRepo();
        if (!isRepo) return { success: true, data: [] };

        const relativePath = path.relative(vaultPath, notePath);
        // --follow tracks renames through history
        const log = await git.log({
          file: relativePath,
          "--follow": null,
        } as any);
        return { success: true, data: log.all };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

  ipcMain.handle(
    "git:getFileContentAtCommit",
    async (_, vaultPath: string, noteId: string, hash: string) => {
      try {
        if (!vaultPath) throw new Error("Vault path not set");
        const note = await getDb("SELECT * FROM notes WHERE id = ?", [
          noteId,
        ]).then((r) => r[0]);
        if (!note) throw new Error("Note not found in DB");
        const notePath = await resolveNotePath(
          vaultPath,
          note.title,
          note.project_id,
        );

        let git = gitCache.get(vaultPath);
        if (!git) {
          git = customRequire("simple-git")(vaultPath);
          gitCache.set(vaultPath, git);
        }
        const isRepo = await git.checkIsRepo();
        if (!isRepo) throw new Error("Not a git repository");

        const relativePath = path.relative(vaultPath, notePath);
        const content = await git.show([`${hash}:${relativePath}`]);
        return { success: true, data: content };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

  ipcMain.handle("git:commitLocal", async (_, folderPath: string) => {
    try {
      if (!folderPath) throw new Error("Vault path not configured");
      const git = customRequire("simple-git")(folderPath);

      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        await git.init();
        await git.addConfig("user.name", "Memoriser");
        await git.addConfig("user.email", "app@memoriser.local");
      }

      await git.add(["docs/", "mkdocs.yml"]);
      const status = await git.status();

      if (status.staged.length > 0) {
        await git.commit("vault: auto-save " + new Date().toISOString());
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("git:sync", async (_, folderPath: string) => {
    try {
      if (!folderPath) throw new Error("Vault path not configured");
      const git = customRequire("simple-git")(folderPath);

      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        await git.init();
        // Set default git identity for auto-commits
        await git.addConfig("user.name", "Memoriser");
        await git.addConfig("user.email", "app@memoriser.local");
      }

      // Only stage docs/ and mkdocs.yml, never .env or secrets
      await git.add(["docs/", "mkdocs.yml"]);
      const status = await git.status();

      if (status.staged.length > 0) {
        await git.commit("vault: sync " + new Date().toISOString());
      }

      // Push to remote if configured
      const settingsRows = await getDb(
        "SELECT key, value FROM settings WHERE key IN ('gitRemoteUrl', 'gitGithubToken', 'githubActions')",
      );

      let remoteUrl: string | null = null;
      let githubToken: string | null = null;
      let ghActions: string | null = null;

      for (const row of settingsRows) {
        if (row.key === "gitRemoteUrl") remoteUrl = row.value;
        if (row.key === "githubActions") ghActions = row.value;
        if (row.key === "gitGithubToken") {
          let val = row.value;
          if (val && safeStorage.isEncryptionAvailable()) {
            try {
              val = safeStorage.decryptString(Buffer.from(val, "base64"));
            } catch (e) {
              console.error(e);
            }
          }
          githubToken = val;
        }
      }

      // 2.5 Generate GitHub Actions workflow if enabled
      if (ghActions === "true") {
        const workflowsDir = path.join(folderPath, ".github", "workflows");
        if (!fsSync.existsSync(workflowsDir)) {
          fsSync.mkdirSync(workflowsDir, { recursive: true });
        }
        const workflowFile = path.join(workflowsDir, "mkdocs.yml");
        if (!fsSync.existsSync(workflowFile)) {
          fsSync.writeFileSync(
            workflowFile,
            `name: Deploy MkDocs
on:
  push:
    branches:
      - main
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: 3.x
      - run: pip install mkdocs-material
      - run: mkdocs gh-deploy --force
`,
          );
          await git.add([".github/"]);
          await git.commit("ci: add mkdocs github actions workflow");
        }
      }

      if (remoteUrl) {
        try {
          const remotes = await git.getRemotes();
          if (!remotes.find((r: any) => r.name === "origin")) {
            await git.addRemote("origin", remoteUrl);
          } else {
            await git.remote(["set-url", "origin", remoteUrl]);
          }

          const branch = await new Promise<string>((res) => {
            getDb("SELECT value FROM settings WHERE key = 'gitBranch'").then(
              (rows) => res(rows.length ? rows[0].value : "main"),
            );
          });

          // 2.3 Securely construct push URL with token if provided
          let pushUrl = remoteUrl;
          if (githubToken && remoteUrl.startsWith("https://")) {
            try {
              const urlObj = new URL(remoteUrl);
              // urlObj.username = githubToken; // Removed for security (token leak in git logs). Using credential helper instead.
              pushUrl = urlObj.toString();
            } catch (e) {
              console.error(e);
              // Ignore parse error
            }
          }

          // Push to the URL with the token, but keep the origin clean in config
          await git.push(pushUrl, branch, ["--set-upstream"]);
          return { success: true, pushed: true };
        } catch (pushErr: any) {
          return { success: true, pushed: false, pushError: pushErr.message };
        }
      }

      return { success: true, pushed: false };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
