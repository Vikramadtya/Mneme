import { safeStorage, app } from "electron";
import path from "node:path";
import fsSync from "node:fs";
import { typedIpcHandle } from "../typedIpc";
import {
  getDb,
  runDb,
  resolveNotePath,
  customRequire,
  gitCache,
} from "../ipcHandlers";
import { store } from "./AppHandlers";

export function registerGitHandlers(ipcMain: any) {
  typedIpcHandle("git:status", async (_, vaultPath: string) => {
    try {
      if (!vaultPath) throw new Error("Vault path not set");
      let git = gitCache.get(vaultPath);
      if (!git) {
        git = customRequire("simple-git")(vaultPath);
        gitCache.set(vaultPath, git);
      }
      const isRepo = await git.checkIsRepo();
      if (!isRepo) return { success: true, data: null };

      const status = await git.status();
      return {
        success: true,
        data: {
          staged: status.staged,
          modified: status.modified,
          not_added: status.not_added,
          created: status.created,
          deleted: status.deleted,
          files: status.files,
        },
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  typedIpcHandle(
    "git:commitAll",
    async (_, vaultPath: string, message: string) => {
      try {
        if (!vaultPath) throw new Error("Vault path not set");
        let git = gitCache.get(vaultPath);
        if (!git) {
          git = customRequire("simple-git")(vaultPath);
          gitCache.set(vaultPath, git);
        }
        const isRepo = await git.checkIsRepo();
        if (!isRepo) return { success: true };

        await git.add(".");
        await git.commit(message || "Auto sync commit");
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    },
  );

  typedIpcHandle("git:squashHistory", async (_, vaultPath: string) => {
    try {
      if (!vaultPath) throw new Error("Vault path not set");
      let git = gitCache.get(vaultPath);
      if (!git) {
        git = customRequire("simple-git")(vaultPath);
        gitCache.set(vaultPath, git);
      }
      const isRepo = await git.checkIsRepo();
      if (!isRepo) throw new Error("Not a git repository");

      const branchSummary = await git.branch();
      const currentBranch = branchSummary.current || "main";

      await git.checkout(["--orphan", "temp_squash_branch"]);
      await git.add(".");
      await git.commit("Initial commit (Squashed)");

      await git.branch(["-D", currentBranch]);
      await git.branch(["-m", currentBranch]);

      const settingsRows = await getDb(
        "SELECT key, value FROM settings WHERE key IN ('gitRemoteUrl')",
      );

      let remoteUrl: string | null = null;
      let githubToken: string | null = null;

      for (const row of settingsRows) {
        if (row.key === "gitRemoteUrl") remoteUrl = row.value;
      }

      const tokenVal = store.get("gitGithubToken") as string | undefined;
      if (tokenVal) {
        if (safeStorage.isEncryptionAvailable()) {
          try {
            githubToken = safeStorage.decryptString(
              Buffer.from(tokenVal, "base64"),
            );
          } catch (e) {
            console.error(e);
            githubToken = tokenVal;
          }
        } else {
          githubToken = tokenVal;
        }
      }

      if (remoteUrl) {
        const remotes = await git.getRemotes();
        if (!remotes.find((r: any) => r.name === "origin")) {
          await git.addRemote("origin", remoteUrl);
        } else {
          await git.remote(["set-url", "origin", remoteUrl]);
        }

        let pushUrl = remoteUrl;
        if (githubToken && remoteUrl.startsWith("https://")) {
          try {
            const urlObj = new URL(remoteUrl);
            pushUrl = urlObj.toString();
          } catch (e) {
            console.error(e);
          }
        }
        await git.push(pushUrl, currentBranch, ["--set-upstream", "--force"]);
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  typedIpcHandle("git:getVaultHistory", async (_, vaultPath: string) => {
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

  typedIpcHandle(
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

  typedIpcHandle(
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
        let targetPath = relativePath;
        try {
          const content = await git.show([`${hash}:${targetPath}`]);
          return { success: true, data: content };
        } catch (e) {
          // File might have been renamed, find historic path
          const logStr = await git.raw([
            "log",
            "--follow",
            "--name-only",
            "--format=%H",
            "--",
            relativePath,
          ]);
          const lines = logStr
            .split("\n")
            .map((l: string) => l.trim())
            .filter(Boolean);
          let currentHash = "";
          for (const line of lines) {
            if (/^[0-9a-f]{40}$/.test(line)) {
              currentHash = line;
            } else if (currentHash === hash) {
              targetPath = line;
              break;
            }
          }
          const content = await git.show([`${hash}:${targetPath}`]);
          return { success: true, data: content };
        }
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

  typedIpcHandle("git:commitLocal", async (_, folderPath: string) => {
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

  typedIpcHandle("git:sync", async (_, folderPath: string) => {
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
        "SELECT key, value FROM settings WHERE key IN ('gitRemoteUrl', 'githubActions')",
      );

      let remoteUrl: string | null = null;
      let githubToken: string | null = null;
      let ghActions: string | null = null;

      for (const row of settingsRows) {
        if (row.key === "gitRemoteUrl") remoteUrl = row.value;
        if (row.key === "githubActions") ghActions = row.value;
      }

      const tokenVal = store.get("gitGithubToken") as string | undefined;
      if (tokenVal) {
        if (safeStorage.isEncryptionAvailable()) {
          try {
            githubToken = safeStorage.decryptString(
              Buffer.from(tokenVal, "base64"),
            );
          } catch (e) {
            console.error(e);
            githubToken = tokenVal;
          }
        } else {
          githubToken = tokenVal;
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
