import type {
  Note,
  Project,
  VaultSettings,
  Commit,
  ActivityLog,
} from "../../domain/models";
import React from "react";
import { AppTab } from "../../domain/enums/AppTab";
export interface VaultContextType {
  syncing: boolean;
  setMkdocsConfig: React.Dispatch<React.SetStateAction<string>>;
  liveUrl: string | null;
  setVaultPath: React.Dispatch<React.SetStateAction<string | null>>;
  handleSync: () => Promise<void>;
  performActualSync: (commitMessage?: string) => Promise<void>;
  handleSelectVault: () => Promise<void>;
  isSyncModalOpen: boolean;
  setIsSyncModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingProject: any | null;
  setEditingProject: React.Dispatch<React.SetStateAction<any | null>>;
  gitStatusForSync: any;
  setGitStatusForSync: React.Dispatch<React.SetStateAction<any>>;
  mkdocsConfig: string;
  vaultPath: string | null;
  isSavingConfig: boolean;
  setVaultSettings: React.Dispatch<React.SetStateAction<VaultSettings | null>>;
  setLiveUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setIsSavingConfig: React.Dispatch<React.SetStateAction<boolean>>;
  isLive: boolean;
  vaultSettings: VaultSettings | null;
  setSyncing: React.Dispatch<React.SetStateAction<boolean>>;
  setIsLive: React.Dispatch<React.SetStateAction<boolean>>;
  handleToggleLive: () => Promise<void>;
  handleOpenLive: () => void;
}

export interface NotesContextType {
  activeHistoryNote: Note | null;
  handleAddNote: (
    projectId: string,
    title?: string,
    content?: string,
    date?: string,
    tagsStr?: string,
  ) => Promise<void>;
  setNoteHistory: React.Dispatch<React.SetStateAction<Commit[]>>;
  selectProject: (id: string, chapterId?: string) => void;
  notes: Note[];
  focusedNoteId: string | null;
  setVaultHistory: React.Dispatch<React.SetStateAction<Commit[]>>;
  handleAddProject: (type: "book" | "course") => Promise<void>;
  setGraphSelectedProjects: React.Dispatch<React.SetStateAction<Set<string>>>;
  viewingCommitHash: string | null;
  allNotesMap: Record<string, Note[]>;
  setActivePdf: React.Dispatch<React.SetStateAction<string | null>>;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  loadDataFromVault: (vPath: string) => Promise<void>;
  setActiveHistoryNote: React.Dispatch<React.SetStateAction<Note | null>>;
  deleteProject: (id: string) => Promise<void>;
  deleteChapter: (id: string) => Promise<void>;
  activeProjectId: string | null;
  allNotesFlat: Note[];
  rootProject: Project | null;
  handleAddChapter: (projectId: string, customName?: string) => Promise<void>;
  activeProject: Project | null;
  graphSelectedProjects: Set<string>;
  setViewingCommitHash: React.Dispatch<React.SetStateAction<string | null>>;
  graphData: any;
  splitPaneNoteId: string | null;
  historicalContent: string | null;
  setAllNotesMap: React.Dispatch<React.SetStateAction<Record<string, Note[]>>>;
  projects: Project[];
  isRootProject: boolean;
  setHistoricalContent: React.Dispatch<React.SetStateAction<string | null>>;
  handleDeleteNote: (noteId: string) => Promise<void>;
  setActiveProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  setSplitPaneNoteId: React.Dispatch<React.SetStateAction<string | null>>;
  setFocusedNoteId: React.Dispatch<React.SetStateAction<string | null>>;
  noteHistory: Commit[];
  activePdf: string | null;
  vaultHistory: Commit[];
  handleArchiveProject: (projectId: string) => Promise<void>;
  handleUnarchiveProject: (projectId: string) => Promise<void>;
}

export interface UIContextType {
  isNewProjectModalOpen: boolean;
  setIsNewProjectModalOpen: (open: boolean, type?: "book" | "course") => void;
  handleRestoreCommit: (note: Note) => void;
  projectViewMode: "grid" | "list" | "toc" | "linear";
  setConfirmRestoreNote: React.Dispatch<React.SetStateAction<Note | null>>;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  setSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  settingsTab: string;
  editFlashcardA: string;
  searchOpen: boolean;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setProjectViewMode: React.Dispatch<
    React.SetStateAction<"grid" | "list" | "toc" | "linear">
  >;
  handleOpenSettings: () => void;
  editFlashcardQ: string;
  setNewNoteTitle: React.Dispatch<React.SetStateAction<string>>;

  setActiveTab: (tab: AppTab) => void;
  todayStr: string;
  handleToggleLive: () => Promise<void>;
  saveEdit: (close?: boolean, overrideContent?: string) => Promise<void>;
  setEditingNoteId: React.Dispatch<React.SetStateAction<string | null>>;
  handleOpenHistory: (note: Note) => Promise<void>;
  handleViewCommit: (noteId: string, hash: string) => Promise<void>;
  newNoteTags: string;
  setIsVaultHistoryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  rightSidebarCollapsed: boolean;
  newNoteDate: string;
  newChapterName: string;
  settingsOpen: boolean;
  trashOpen: boolean;
  setTrashOpen: (val: boolean) => void;
  editingNoteId: string | null;
  isSyncingVault: boolean;
  sidebarCollapsed: boolean;
  setAddingProjectType: React.Dispatch<
    React.SetStateAction<"book" | "course" | "chapter" | null>
  >;
  setZenMode: React.Dispatch<React.SetStateAction<boolean>>;
  setSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isHistoryOpen: boolean;
  setEditNoteContent: React.Dispatch<React.SetStateAction<string>>;
  setNewChapterName: React.Dispatch<React.SetStateAction<string>>;
  editNoteTitle: string;
  toggleCard: (noteId: string) => void;
  expandedProjects: Record<string, boolean>;
  setExpandedProjects: (
    updater: (prev: Record<string, boolean>) => Record<string, boolean>,
  ) => void;
  addingChapterTo: string | null;
  setAddingChapterTo: (id: string | null) => void;
  handleDragOver: (e: React.DragEvent) => void;
  setNewNoteDate: React.Dispatch<React.SetStateAction<string>>;
  setRightSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  newNoteContent: any;
  setSettingsTab: React.Dispatch<React.SetStateAction<string>>;
  cheatsheetOpen: any;
  setCheatsheetOpen: any;
  toggleGraphProject: (projectId: string) => void;
  handleSaveSettings: (newSettings: Partial<VaultSettings>) => Promise<void>;
  setEditNoteTitle: React.Dispatch<React.SetStateAction<string>>;
  setEditFlashcardA: React.Dispatch<React.SetStateAction<string>>;
  newNoteTitle: string;
  handleOpenVaultHistory: any;
  addingProjectType: "book" | "course" | "chapter" | null;
  setNewProjectName: React.Dispatch<React.SetStateAction<string>>;
  handleDrop: (e: React.DragEvent, isEditor?: boolean) => Promise<void>;
  toggleFavourite: (noteId: string) => Promise<void>;
  setCmdkOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsAppReady: React.Dispatch<React.SetStateAction<boolean>>;
  handleOpenLive: () => void;
  setEditNoteTags: React.Dispatch<React.SetStateAction<string>>;
  isAppReady: boolean;
  setNewNoteTags: React.Dispatch<React.SetStateAction<string>>;
  searchQuery: string;
  isVaultHistoryOpen: any;
  editNoteContent: string;

  activeTab: AppTab;
  editNoteTags: any;
  cmdkOpen: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  newProjectName: string;
  startEditing: (note: Note) => void;
  setNewNoteContent: React.Dispatch<React.SetStateAction<string>>;
  handleUndoDelete: () => Promise<void>;
  renamingProjectName: string;
  setIsHistoryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setEditFlashcardQ: React.Dispatch<React.SetStateAction<string>>;
  setIsSyncingVault: React.Dispatch<React.SetStateAction<boolean>>;
  confirmRestore: () => Promise<void>;
  zenMode: boolean;
  confirmRestoreNote: Note | null;
}

export interface ReviewContextType {
  revealedCards: Set<string>;
  updateNoteSRS: (
    note: Note,
    quality: number,
    explicitInterval?: number,
  ) => Promise<void>;
  calculateNextInterval: (note: Note, quality: number) => number;
  setActivityLogs: React.Dispatch<React.SetStateAction<ActivityLog[]>>;
  setReviewIndex: React.Dispatch<React.SetStateAction<number>>;
  reviewMode: boolean;
  setRevealedCards: React.Dispatch<React.SetStateAction<Set<string>>>;
  formatInterval: (days: number) => string;
  activityLogs: ActivityLog[];
  setReviewMode: React.Dispatch<React.SetStateAction<boolean>>;
  reviewIndex: number;
  dueReviewNotes: Note[];
}
