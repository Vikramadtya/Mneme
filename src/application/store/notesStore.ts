import { create } from "zustand";
import type { Note } from "../../domain/models";

interface NotesState {
  projects: any[];
  activeProjectId: string | null;
  allNotesMap: Record<string, Note[]>;
  focusedNoteId: string | null;
  graphSelectedProjects: Set<string>;
  activePdf: string | null;
  viewingCommitHash: string | null;
  historicalContent: string | null;

  setProjects: (projects: any[]) => void;
  setActiveProjectId: (id: string | null) => void;
  setAllNotesMap: (map: Record<string, Note[]>) => void;
  setFocusedNoteId: (id: string | null) => void;
  setGraphSelectedProjects: (projects: Set<string>) => void;
  setActivePdf: (pdf: string | null) => void;
  setViewingCommitHash: (hash: string | null) => void;
  setHistoricalContent: (content: string | null) => void;

  // Derived getters that can be used via selectors
  getNotes: () => Note[];
  getAllNotesFlat: () => Note[];
}

export const useNotesStore = create<NotesState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  allNotesMap: {},
  focusedNoteId: null,
  graphSelectedProjects: new Set(),
  activePdf: null,
  viewingCommitHash: null,
  historicalContent: null,

  setProjects: (projects) => set({ projects }),
  setActiveProjectId: (id) => set({ activeProjectId: id }),
  setAllNotesMap: (map) => set({ allNotesMap: map }),
  setFocusedNoteId: (id) => set({ focusedNoteId: id }),
  setGraphSelectedProjects: (projects) =>
    set({ graphSelectedProjects: projects }),
  setActivePdf: (pdf) => set({ activePdf: pdf }),
  setViewingCommitHash: (hash) => set({ viewingCommitHash: hash }),
  setHistoricalContent: (content) => set({ historicalContent: content }),

  getNotes: () => {
    const { activeProjectId, allNotesMap } = get();
    return activeProjectId ? allNotesMap[activeProjectId] || [] : [];
  },

  getAllNotesFlat: () => {
    const { allNotesMap } = get();
    return Object.values(allNotesMap).flat();
  },
}));
