import { ipcClient } from "@/api/ipcClient";
import { useState, useCallback, useEffect } from "react";
import type { VaultSettings } from "../../domain/models";
import type { VaultContextType } from "../context/types";

export function useVaultState(
  showToast: (msg: string, type?: "success" | "error" | "info") => void,
) {
  const [syncing, setSyncing] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [mkdocsConfig, setMkdocsConfig] = useState<string>("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [vaultSettings, setVaultSettings] = useState<VaultSettings | null>(
    null,
  );

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [gitStatusForSync, setGitStatusForSync] = useState<any>(null);
  const [editingProject, setEditingProject] = useState<any | null>(null);

  const performActualSync = useCallback(
    async (commitMessage?: string) => {
      if (!vaultPath) return;
      setSyncing(true);
      try {
        if (commitMessage) {
          const commitRes = await ipcClient.git.commitAll(
            vaultPath,
            commitMessage,
          );
          if (!commitRes.success) throw new Error(commitRes.error);
        }
        const resDb = await ipcClient.db.syncFromVault(vaultPath);
        if (!resDb.success) throw new Error(resDb.error);
        const resGit = await ipcClient.git.sync(vaultPath);
        if (!resGit.success) throw new Error(resGit.error);
        showToast("Vault synced successfully", "success");
      } catch (e: any) {
        showToast("Sync failed: " + e.message, "error");
      } finally {
        setSyncing(false);
        setIsSyncModalOpen(false);
      }
    },
    [vaultPath, showToast],
  );

  const handleSync = useCallback(async () => {
    if (!vaultPath || syncing) return;
    setSyncing(true);
    try {
      const statusRes = await ipcClient.git.status(vaultPath);
      if (
        statusRes.success &&
        statusRes.data &&
        statusRes.data.files &&
        statusRes.data.files.length > 0
      ) {
        setGitStatusForSync(statusRes.data);
        setIsSyncModalOpen(true);
      } else {
        await performActualSync();
      }
    } catch (e: any) {
      showToast("Sync precheck failed: " + e.message, "error");
    } finally {
      setSyncing(false);
    }
  }, [vaultPath, syncing, showToast, performActualSync]);

  const handleSelectVault = useCallback(async () => {
    try {
      const vPath = await ipcClient.app.selectVault();
      if (vPath && vPath.success && vPath.data) {
        setVaultPath(vPath.data);
      }
    } catch (e: any) {
      showToast("Failed to select vault: " + e.message, "error");
    }
  }, [showToast]);

  const handleToggleLive = useCallback(async () => {
    if (!vaultPath) return;
    const res = await ipcClient.app.toggleLive(vaultPath);
    if (res.success) {
      setIsLive((res.data as any)?.active || false);
      if ((res.data as any)?.active) {
        setLiveUrl(res.data?.url || null);
      } else {
        setLiveUrl(null);
      }
    } else {
      showToast(res.error || "Failed to start live preview", "error");
    }
  }, [vaultPath, showToast]);

  const handleOpenLive = useCallback(async () => {
    if (liveUrl) {
      await ipc.invoke("app:openExternal", liveUrl);
    }
  }, [liveUrl]);

  const handleSaveSettings = useCallback(
    async (newSettings?: Partial<VaultSettings>) => {
      if (!vaultPath || !vaultSettings) return;
      setIsSavingConfig(true);
      try {
        const mergedSettings = { ...vaultSettings, ...newSettings };

        // Save MkDocs config
        if (mkdocsConfig) {
          let updatedConfig = mkdocsConfig;
          if (mergedSettings.mkdocsSiteName) {
            updatedConfig = updatedConfig.replace(
              /^site_name:\s*.*$/m,
              `site_name: ${mergedSettings.mkdocsSiteName}`,
            );
            setMkdocsConfig(updatedConfig);
          }
          await ipcClient.fs.saveMkdocsConfig(vaultPath, updatedConfig);
        }

        // Save all vault settings
        await ipcClient.db.saveSettings(mergedSettings);

        // Generate GitHub Action if enabled
        if (mergedSettings.githubActionsEnabled) {
          await ipcClient.app.generateGithubAction(vaultPath);
        }

        setVaultSettings(mergedSettings);
        showToast("Settings saved successfully!", "success");
      } catch (e: any) {
        showToast("Failed to save settings: " + e.message, "error");
      } finally {
        setIsSavingConfig(false);
      }
    },
    [vaultPath, vaultSettings, mkdocsConfig, showToast],
  );

  useEffect(() => {
    ipc
      .invoke("db:getSettings")
      .then((res) => {
        if (res.success && res.data) {
          setVaultSettings(res.data as unknown as VaultSettings);
        }
      })
      .catch((e) => console.error("Failed to load vault settings", e));
  }, []);

  return {
    syncing,
    setSyncing,
    isLive,
    setIsLive,
    liveUrl,
    setLiveUrl,
    vaultPath,
    setVaultPath,
    mkdocsConfig,
    setMkdocsConfig,
    isSavingConfig,
    setIsSavingConfig,
    vaultSettings,
    setVaultSettings,
    handleSync,
    handleSelectVault,
    handleToggleLive,
    handleOpenLive,
    handleSaveSettings,
    performActualSync,
    isSyncModalOpen,
    setIsSyncModalOpen,
    gitStatusForSync,
    setGitStatusForSync,
    editingProject,
    setEditingProject,
  };
}
