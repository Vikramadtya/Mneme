import { useState, useCallback, useEffect } from "react";
import { ipc } from "../../ipc";
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

  const handleSync = useCallback(async () => {
    if (!vaultPath || syncing) return;
    setSyncing(true);
    try {
      const resDb = await ipc.syncFromVault(vaultPath);
      if (!resDb.success) throw new Error(resDb.error);
      const resGit = await (ipc as any).syncGit(vaultPath);
      if (!resGit.success) throw new Error(resGit.error);
      showToast("Vault synced successfully", "success");
    } catch (e: any) {
      showToast("Sync failed: " + e.message, "error");
    } finally {
      setSyncing(false);
    }
  }, [vaultPath, syncing, showToast]);

  const handleSelectVault = useCallback(async () => {
    try {
      const vPath = await (ipc as any).selectFolder();
      if (vPath) {
        setVaultPath(vPath);
      }
    } catch (e: any) {
      showToast("Failed to select vault: " + e.message, "error");
    }
  }, [showToast]);

  const handleToggleLive = useCallback(async () => {
    if (!vaultPath) return;
    const res = await ipc.toggleLive(vaultPath);
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
      await ipc.openExternal(liveUrl);
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
          await ipc.saveMkdocsConfig(vaultPath, updatedConfig);
        }

        // Save all vault settings
        await ipc.saveSettings(mergedSettings);

        // Generate GitHub Action if enabled
        if (mergedSettings.githubActionsEnabled) {
          await ipc.generateGithubAction(vaultPath);
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
      .getSettings()
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
  };
}
