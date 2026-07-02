import { create } from "zustand";

interface VaultState {
  isAppReady: boolean;
  isSyncingVault: boolean;
  isLive: boolean;
  liveUrl: string | null;
  vaultPath: string | null;
  mkdocsConfig: string;
  isSavingConfig: boolean;
  vaultSettings: Record<string, string>;
  syncing: boolean;

  setIsAppReady: (ready: boolean) => void;
  setIsSyncingVault: (syncing: boolean) => void;
  setIsLive: (live: boolean) => void;
  setLiveUrl: (url: string | null) => void;
  setVaultPath: (path: string | null) => void;
  setMkdocsConfig: (config: string) => void;
  setIsSavingConfig: (saving: boolean) => void;
  setVaultSettings: (settings: Record<string, string>) => void;
  setSyncing: (syncing: boolean) => void;
}

export const useVaultStore = create<VaultState>((set) => ({
  isAppReady: false,
  isSyncingVault: false,
  isLive: false,
  liveUrl: null,
  vaultPath: null,
  mkdocsConfig: "",
  isSavingConfig: false,
  vaultSettings: {},
  syncing: false,

  setIsAppReady: (ready) => set({ isAppReady: ready }),
  setIsSyncingVault: (syncing) => set({ isSyncingVault: syncing }),
  setIsLive: (live) => set({ isLive: live }),
  setLiveUrl: (url) => set({ liveUrl: url }),
  setVaultPath: (path) => set({ vaultPath: path }),
  setMkdocsConfig: (config) => set({ mkdocsConfig: config }),
  setIsSavingConfig: (saving) => set({ isSavingConfig: saving }),
  setVaultSettings: (settings) => set({ vaultSettings: settings }),
  setSyncing: (syncing) => set({ syncing }),
}));
