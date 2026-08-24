import { create } from "zustand";
import { toast } from "sonner";
import { AppTab } from "../../domain/enums/AppTab";

interface UIState {
  activeTab: AppTab;
  isHistoryOpen: boolean;
  isVaultHistoryOpen: boolean;
  cheatsheetOpen: boolean;
  cmdkOpen: boolean;
  splitPaneNoteId: string | null;
  searchOpen: boolean;
  settingsOpen: boolean;
  isNewProjectModalOpen: boolean;
  settingsTab: "general" | "git" | "website" | "appearance" | "ai" | "data";
  searchQuery: string;
  zenMode: boolean;
  sidebarCollapsed: boolean;
  rightSidebarCollapsed: boolean;
  // Project view
  projectViewMode: "grid" | "list" | "toc" | "linear";
  // Adding/editing project
  addingProjectType: "book" | "course" | "chapter" | null;
  // Syncing state
  isSyncingVault: boolean;

  setActiveTab: (tab: AppTab) => void;
  setIsHistoryOpen: (open: boolean) => void;
  setIsVaultHistoryOpen: (open: boolean) => void;
  setCheatsheetOpen: (open: boolean) => void;
  setCmdkOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
  setSplitPaneNoteId: (id: string | null) => void;
  setSearchOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setIsNewProjectModalOpen: (open: boolean, type?: "book" | "course") => void;
  setSettingsTab: (
    tab: "general" | "git" | "website" | "appearance" | "ai" | "data",
  ) => void;
  setSearchQuery: (query: string) => void;
  setZenMode: (mode: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  setRightSidebarCollapsed: (collapsed: boolean) => void;
  setProjectViewMode: (mode: "grid" | "list" | "toc" | "linear") => void;
  setAddingProjectType: (type: "book" | "course" | "chapter" | null) => void;
  setIsSyncingVault: (syncing: boolean) => void;
  openTabs: {
    id: string;
    title: string;
    type: "note" | "project";
    lastAccessed?: number;
  }[];
  activeTabId: string | null;
  addTab: (tab: {
    id: string;
    title: string;
    type: "note" | "project";
    lastAccessed?: number;
  }) => void;
  removeTab: (id: string) => void;
  setActiveTabId: (id: string | null) => void;
  rightSidebarTab: "stats" | "outline";
  setRightSidebarTab: (tab: "stats" | "outline") => void;
  activeNoteToc: { level: number; text: string; id: string }[];
  setActiveNoteToc: (
    toc: { level: number; text: string; id: string }[],
  ) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: AppTab.AGENDA,
  isHistoryOpen: false,
  isVaultHistoryOpen: false,
  cheatsheetOpen: false,
  cmdkOpen: false,
  splitPaneNoteId: null,
  searchOpen: false,
  settingsOpen: false,
  isNewProjectModalOpen: false,

  openTabs: [],
  activeTabId: null,

  settingsTab: "general",
  searchQuery: "",
  zenMode: false,
  sidebarCollapsed: false,
  sidebarWidth: 280,
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  rightSidebarCollapsed: false,
  projectViewMode: "linear",
  addingProjectType: null,
  isSyncingVault: false,

  addTab: (tab) =>
    set((state) => {
      const now = Date.now();
      let newTabs = [...state.openTabs];
      const existing = newTabs.find((t) => t.id === tab.id);

      if (existing) {
        existing.lastAccessed = now;
      } else {
        newTabs.push({ ...tab, lastAccessed: now });
      }

      if (newTabs.length > 10) {
        const oldest = newTabs.reduce(
          (min, t) => {
            if (t.id === tab.id) return min;
            const tTime = t.lastAccessed || 0;
            const minTime = min.lastAccessed || 0;
            return tTime < minTime ? t : min;
          },
          newTabs.find((t) => t.id !== tab.id) || newTabs[0],
        );

        newTabs = newTabs.filter((t) => t.id !== oldest.id);
      }

      return { openTabs: newTabs, activeTabId: tab.id };
    }),
  removeTab: (id) =>
    set((state) => {
      const newTabs = state.openTabs.filter((t) => t.id !== id);
      const newActiveId =
        state.activeTabId === id
          ? newTabs.length > 0
            ? newTabs[newTabs.length - 1].id
            : null
          : state.activeTabId;
      return {
        openTabs: newTabs,
        activeTabId: newActiveId,
      };
    }),
  setActiveTabId: (id) =>
    set((state) => {
      if (!id) return { activeTabId: null };
      const now = Date.now();
      const newTabs = state.openTabs.map((t) =>
        t.id === id ? { ...t, lastAccessed: now } : t,
      );
      return { activeTabId: id, openTabs: newTabs };
    }),
  rightSidebarTab: "stats",
  setRightSidebarTab: (tab) => set({ rightSidebarTab: tab }),
  activeNoteToc: [],
  setActiveNoteToc: (toc) => set({ activeNoteToc: toc }),

  setActiveTab: (tab) => set({ activeTab: tab }),
  setIsHistoryOpen: (open) => set({ isHistoryOpen: open }),
  setIsVaultHistoryOpen: (open) => set({ isVaultHistoryOpen: open }),
  setCheatsheetOpen: (open) => set({ cheatsheetOpen: open }),
  setCmdkOpen: (open) =>
    set((state) => ({
      cmdkOpen: typeof open === "function" ? open(state.cmdkOpen) : open,
    })),

  showToast: (message, type = "success") => {
    if (type === "success") toast.success(message);
    else if (type === "error") toast.error(message);
    else toast.info(message);
  },
  removeToast: () => {},

  setSplitPaneNoteId: (id) => set({ splitPaneNoteId: id }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setIsNewProjectModalOpen: (open, type) =>
    set((state) => ({
      isNewProjectModalOpen: open,
      addingProjectType: type || state.addingProjectType,
    })),
  setSettingsTab: (tab) => set({ settingsTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setZenMode: (mode) => set({ zenMode: mode }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setRightSidebarCollapsed: (collapsed) =>
    set({ rightSidebarCollapsed: collapsed }),
  setProjectViewMode: (mode) => set({ projectViewMode: mode }),
  setAddingProjectType: (type) => set({ addingProjectType: type }),
  setIsSyncingVault: (syncing) => set({ isSyncingVault: syncing }),
}));
