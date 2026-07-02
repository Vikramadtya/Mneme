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
  isNewBookModalOpen: boolean;
  isNewCourseModalOpen: boolean;
  settingsTab: "general" | "git" | "mkdocs" | "appearance";
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
  setIsNewBookModalOpen: (open: boolean) => void;
  setIsNewCourseModalOpen: (open: boolean) => void;
  setSettingsTab: (tab: "general" | "git" | "mkdocs" | "appearance") => void;
  setSearchQuery: (query: string) => void;
  setZenMode: (mode: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setRightSidebarCollapsed: (collapsed: boolean) => void;
  setProjectViewMode: (mode: "grid" | "list" | "toc" | "linear") => void;
  setAddingProjectType: (type: "book" | "course" | "chapter" | null) => void;
  setIsSyncingVault: (syncing: boolean) => void;
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
  isNewBookModalOpen: false,
  isNewCourseModalOpen: false,
  settingsTab: "general",
  searchQuery: "",
  zenMode: false,
  sidebarCollapsed: false,
  rightSidebarCollapsed: false,
  projectViewMode: "linear",
  addingProjectType: null,
  isSyncingVault: false,

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
  setIsNewBookModalOpen: (open) => set({ isNewBookModalOpen: open }),
  setIsNewCourseModalOpen: (open) => set({ isNewCourseModalOpen: open }),
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
