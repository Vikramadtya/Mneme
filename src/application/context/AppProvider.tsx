import { ipcClient } from "@/api/ipcClient";
import React, { useEffect } from "react";
import { VaultContext } from "./VaultContext";
import { NotesContext } from "./NotesContext";
import { UIContext } from "./UIContext";
import { ReviewContext } from "./ReviewContext";
import { useUIStore } from "../store/uiStore";
import { tinykeys } from "tinykeys";

// Import Custom Hooks for domain logic
import { useVaultState } from "../hooks/useVaultState";
import { useNotesState } from "../hooks/useNotesState";
import { useUIState } from "../hooks/useUIState";
import { useReviewState } from "../hooks/useReviewState";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const uiStore = useUIStore();
  const showToast = uiStore.showToast;

  // 1. Vault State
  const vaultState = useVaultState(showToast);

  // 2. Notes State (depends on Vault)
  const notesState = useNotesState(vaultState.vaultPath, showToast);

  // 3. UI State handlers (note editing, history, drop, etc.)
  const uiHandlers = useUIState(
    vaultState.vaultPath,
    notesState.allNotesMap,
    notesState.setAllNotesMap,
    notesState.activeProjectId,
    vaultState.handleSync,
    notesState.setNoteHistory,
    notesState.setActiveHistoryNote,
    notesState.setViewingCommitHash,
    notesState.setHistoricalContent,
    notesState.viewingCommitHash,
    notesState.historicalContent,
  );

  // 4. Review State
  const reviewState = useReviewState(
    vaultState.vaultPath,
    notesState.allNotesFlat,
    notesState.allNotesMap,
    notesState.activeProjectId,
    notesState.setAllNotesMap,
  );

  // Build Notes context — splice in splitPaneNoteId from uiStore
  const fullNotesContextValue = {
    ...notesState,
    handleArchiveProject: notesState.handleArchiveProject,
    handleUnarchiveProject: notesState.handleUnarchiveProject,
    splitPaneNoteId: uiStore.splitPaneNoteId,
    setSplitPaneNoteId: uiStore.setSplitPaneNoteId,
  };

  // Build UI context — merge uiStore + uiHandlers + cross-domain handlers
  // Components use useUI() for ALL of these, so everything must be here.
  const uiContextValue = {
    // --- Zustand store fields (plain state + setters) ---
    ...uiStore,
    // --- Complex handlers from useUIState ---
    ...uiHandlers,
    // --- Cross-domain handlers wired from vault ---    handleSaveSettings: vaultState.handleSaveSettings,
    // --- Cross-domain handlers wired from notes ---
    toggleFavourite: notesState.toggleFavourite,
    handleUndoDelete: notesState.handleUndoDelete,
    toggleGraphProject: notesState.toggleGraphProject,
    // --- Cross-domain handlers wired from review ---
    toggleCard: reviewState.toggleCard,
    // --- Misc that components expect on useUI ---
    todayStr: new Date().toISOString().split("T")[0],
    handleOpenSettings: () => uiStore.setSettingsOpen(true),
    handleOpenVaultHistory: () => uiStore.setIsVaultHistoryOpen(true),
    isSyncingVault: uiStore.isSyncingVault,
  };

  // ----------------------------------------------------
  // Application Bootstrap & Global Listeners
  // ----------------------------------------------------

  // 1. Initial App Load — run once on mount
  useEffect(() => {
    const initApp = async () => {
      const configRes = await ipcClient.app.getConfig();
      const vPath = configRes.data?.vaultPath;
      if (vPath) {
        vaultState.setVaultPath(vPath);
      } else {
        uiHandlers.setIsAppReady(true);
      }
    };
    initApp();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 1b. When vaultPath becomes available, load vault data
  useEffect(() => {
    if (vaultState.vaultPath) {
      notesState.loadDataFromVault(vaultState.vaultPath).finally(() => {
        uiHandlers.setIsAppReady(true);
      });
    }
  }, [vaultState.vaultPath]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. External Vault File Change Listener
  useEffect(() => {
    if (vaultState.vaultPath && !vaultState.syncing) {
      const unsub = ipcClient.on("vault-file-changed", async () => {
        try {
          await ipcClient.db.syncFromVault(vaultState.vaultPath!);
          const dbRes = await ipcClient.db.getInitialState(
            vaultState.vaultPath!,
          );
          if (dbRes.success && dbRes.data) {
            notesState.setProjects(dbRes.data.projects || []);
            notesState.setAllNotesMap(dbRes.data.allNotesMap || {});
          }
        } catch (err) {
          console.error("Silent reload failed", err);
        }
      });
      return unsub;
    }
  }, [vaultState.vaultPath, vaultState.syncing]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3. Auto-select root projects for Graph view
  useEffect(() => {
    if (
      notesState.projects.length > 0 &&
      notesState.graphSelectedProjects.size === 0
    ) {
      const initialSet = new Set<string>();
      notesState.projects
        .filter((p) => p.type === "book" || p.type === "course")
        .forEach((p) => initialSet.add(p.id));
      if (initialSet.size > 0) {
        notesState.setGraphSelectedProjects(initialSet);
      }
    }
  }, [notesState.projects.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // 4. Global Keyboard Shortcuts
  useEffect(() => {
    const unsubscribe = tinykeys(window, {
      "$mod+k": (e) => {
        e.preventDefault();
        uiStore.setCmdkOpen(!uiStore.cmdkOpen);
      },
      "$mod+s": (e) => {
        e.preventDefault();
        if (uiHandlers.editingNoteId) uiHandlers.saveEdit(false);
      },
      "$mod+/": (e) => {
        e.preventDefault();
        uiStore.setCheatsheetOpen(!uiStore.cheatsheetOpen);
      },
      Escape: () => {
        if (uiStore.settingsOpen) uiStore.setSettingsOpen(false);
        else if (uiStore.searchOpen) uiStore.setSearchOpen(false);
        else if (uiStore.cmdkOpen) uiStore.setCmdkOpen(false);
        else if (uiStore.isHistoryOpen) uiStore.setIsHistoryOpen(false);
        else if (notesState.activePdf) notesState.setActivePdf(null);
        else if (uiHandlers.confirmRestoreNote)
          uiHandlers.setConfirmRestoreNote(null);
      },
    });
    return () => unsubscribe();
  }, [
    uiStore.cmdkOpen,
    uiStore.cheatsheetOpen,
    uiStore.settingsOpen,
    uiStore.searchOpen,
    uiStore.isHistoryOpen,
    uiHandlers.editingNoteId,
    notesState.activePdf,
    uiHandlers.confirmRestoreNote,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // 5. Theme Applicator
  useEffect(() => {
    const theme = vaultState.vaultSettings?.theme || "system";
    const isDark =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [vaultState.vaultSettings?.theme]);

  return (
    <VaultContext.Provider value={vaultState as any}>
      <NotesContext.Provider value={fullNotesContextValue as any}>
        <UIContext.Provider value={uiContextValue as any}>
          <ReviewContext.Provider value={reviewState as any}>
            {children}
          </ReviewContext.Provider>
        </UIContext.Provider>
      </NotesContext.Provider>
    </VaultContext.Provider>
  );
}
