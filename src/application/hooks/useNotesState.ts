import { useState, useCallback, useMemo, useRef } from "react";
import { ipc } from "../../ipc";
import type { Note, Project, Commit } from "../../domain/models";
import { produce } from "immer";
import { nanoid } from "nanoid";
import type { NotesContextType } from "../context/types";
import { useUIStore } from "../store/uiStore";

export function useNotesState(
  vaultPath: string | null,
  showToast: (msg: string, type?: "success" | "error" | "info") => void,
) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [allNotesMap, setAllNotesMap] = useState<Record<string, Note[]>>({});
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [focusedNoteId, setFocusedNoteId] = useState<string | null>(null);
  const [graphSelectedProjects, setGraphSelectedProjects] = useState<
    Set<string>
  >(new Set());
  const [activePdf, setActivePdf] = useState<string | null>(null);
  const [viewingCommitHash, setViewingCommitHash] = useState<string | null>(
    null,
  );
  const [historicalContent, setHistoricalContent] = useState<string | null>(
    null,
  );
  const [noteHistory, setNoteHistory] = useState<Commit[]>([]);
  const [activeHistoryNote, setActiveHistoryNote] = useState<Note | null>(null);
  const [vaultHistory, setVaultHistory] = useState<Commit[]>([]);
  const [deletePendingNoteId, setDeletePendingNoteId] = useState<string | null>(
    null,
  );
  const pendingDeletions = useRef<
    Record<string, { note: any; timeout: ReturnType<typeof setTimeout> }>
  >({});

  const activeProject = useMemo(
    () =>
      activeProjectId
        ? projects.find((p) => p.id === activeProjectId) ||
          projects
            .flatMap((p) => p.chapters || [])
            .find((c) => c.id === activeProjectId)
        : null,
    [activeProjectId, projects],
  );

  const isRootProject = useMemo(
    () => activeProject?.type === "book" || activeProject?.type === "course",
    [activeProject],
  );

  const rootProject = useMemo(
    () =>
      projects.find((p) => p.id === activeProjectId) ||
      projects.find((p) =>
        p.chapters?.some((c: any) => c.id === activeProjectId),
      ) ||
      null,
    [activeProjectId, projects],
  );

  const notes = activeProjectId ? allNotesMap[activeProjectId] || [] : [];

  const setNotes = useCallback(
    (newNotes: any) => {
      if (!activeProjectId) return;
      setAllNotesMap(
        produce((draft) => {
          draft[activeProjectId] =
            typeof newNotes === "function"
              ? newNotes(draft[activeProjectId] as Note[])
              : newNotes;
        }),
      );
    },
    [activeProjectId],
  );

  const allNotesFlat = useMemo(
    () => Object.values(allNotesMap).flat(),
    [allNotesMap],
  );

  const loadDataFromVault = useCallback(
    async (vPath: string) => {
      try {
        const updateState = (data: any) => {
          setProjects(data.projects || []);
          setAllNotesMap(data.allNotesMap || {});
          setGraphSelectedProjects(
            new Set(
              (data.projects || [])
                .filter(
                  (p: Project) => p.type === "book" || p.type === "course",
                )
                .map((p: Project) => p.id),
            ),
          );
        };

        const dbRes = await ipc.invoke("db:getInitialState", vPath);
        if (dbRes.success && dbRes.data) {
          updateState(dbRes.data);
        }

        ipc
          .invoke("db:syncFromVault", vPath)
          .then(async () => {
            const syncedRes = await ipc.invoke("db:getInitialState", vPath);
            if (syncedRes.success && syncedRes.data) {
              updateState(syncedRes.data);
            }
          })
          .catch((e) => console.error("Background sync failed", e));
      } catch (e: any) {
        console.error("Failed to load vault:", e);
        showToast("Failed to load vault: " + e.message, "error");
      }
    },
    [showToast],
  );

  const handleAddProject = useCallback(
    async (type: "book" | "course") => {
      if (!vaultPath) return;
      try {
        const pId = nanoid();
        await ipc.invoke("db:saveProject", vaultPath, {
          id: pId,
          name: "New " + type,
          type,
        } as any);
        await loadDataFromVault(vaultPath);
        setActiveProjectId(pId);
        showToast(`Created new ${type}`, "success");
      } catch (e: any) {
        showToast("Failed to create project: " + e.message, "error");
      }
    },
    [vaultPath, loadDataFromVault, showToast],
  );

  const handleArchiveProject = useCallback(
    async (projectId: string) => {
      if (!vaultPath) return;
      try {
        const res = await ipc.invoke("db:archiveProject", vaultPath, projectId);
        if (res.success) {
          await loadDataFromVault(vaultPath);
          showToast("Archived successfully", "success");
        } else {
          showToast("Failed to archive: " + res.error, "error");
        }
      } catch (e: any) {
        showToast("Error archiving: " + e.message, "error");
      }
    },
    [vaultPath, loadDataFromVault, showToast],
  );

  const handleUnarchiveProject = useCallback(
    async (projectId: string) => {
      if (!vaultPath) return;
      try {
        const res = await ipc.invoke(
          "db:unarchiveProject",
          vaultPath,
          projectId,
        );
        if (res.success) {
          await loadDataFromVault(vaultPath);
          showToast("Unarchived successfully", "success");
        } else {
          showToast("Failed to unarchive: " + res.error, "error");
        }
      } catch (e: any) {
        showToast("Error unarchiving: " + e.message, "error");
      }
    },
    [vaultPath, loadDataFromVault, showToast],
  );

  const handleAddChapter = useCallback(
    async (projectId: string, customName?: string) => {
      if (!vaultPath) return;
      try {
        const chapterId = nanoid();
        await ipc.invoke("db:saveProject", vaultPath, {
          id: chapterId,
          name: customName || "New Chapter",
          type: "chapter",
          parent_id: projectId,
        } as any);
        await loadDataFromVault(vaultPath);
        setActiveProjectId(chapterId);
        showToast("Chapter created", "success");
      } catch (e: any) {
        showToast("Failed to create chapter: " + e.message, "error");
      }
    },
    [vaultPath, loadDataFromVault, showToast],
  );

  const handleAddNote = useCallback(
    async (
      projectId: string,
      title?: string,
      content?: string,
      date?: string,
      tagsStr?: string,
    ) => {
      if (!vaultPath) return;
      try {
        const now = new Date();
        const dStr =
          date ||
          `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const newNote: Note = {
          id: nanoid(),
          date: dStr,
          time: now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          title: title || "Quick Note",
          content: content || "",
          tags: tagsStr
            ? tagsStr
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
          favourite: false,
          chapterId: isRootProject ? undefined : activeProject?.id,
          project_id: isRootProject ? activeProject?.id : undefined,
        };

        setAllNotesMap(
          produce((draft) => {
            if (!draft[projectId]) draft[projectId] = [];
            draft[projectId].unshift(newNote);
          }),
        );

        setFocusedNoteId(newNote.id);
        ipc
          .invoke("db:saveNote", vaultPath, newNote)
          .then(() => ipc.invoke("db:logActivity", vaultPath, dStr, "create"))
          .catch((e) =>
            showToast("Failed to save note: " + e.message, "error"),
          );
      } catch (e: any) {
        showToast("Failed to create note: " + e.message, "error");
      }
    },
    [vaultPath, showToast, isRootProject, activeProject],
  );

  const selectProject = useCallback((id: string, chapterId?: string) => {
    setActiveProjectId(chapterId || id);
    setFocusedNoteId(null);
  }, []);

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      const noteToDelete = allNotesFlat.find((n: Note) => n.id === noteId);
      const projId = Object.keys(allNotesMap).find((pid) =>
        allNotesMap[pid].some((n: Note) => n.id === noteId),
      );

      setAllNotesMap(
        produce((draft: Record<string, Note[]>) => {
          if (projId && draft[projId]) {
            draft[projId] = draft[projId].filter((n) => n.id !== noteId);
          }
        }),
      );

      // For undo
      const toastId = showToast(
        `"${noteToDelete?.title || "Note"}" deleted`,
        "info",
      );

      const undoTimeout = setTimeout(async () => {
        if (vaultPath) {
          await ipc.invoke("db:deleteNote", vaultPath, noteId);
        }
        delete pendingDeletions.current[noteId];
      }, 4000);

      setDeletePendingNoteId(noteId);
      pendingDeletions.current[noteId] = {
        note: noteToDelete,
        timeout: undoTimeout,
      };
    },
    [allNotesFlat, allNotesMap, setAllNotesMap, showToast, vaultPath],
  );

  const toggleGraphProject = useCallback((id: string) => {
    setGraphSelectedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleFavourite = useCallback(
    async (noteId: string) => {
      const note = allNotesFlat.find((n: Note) => n.id === noteId);
      if (!note) return;
      const newFav = !note.favourite;
      const updated = { ...note, favourite: newFav };

      setAllNotesMap(
        produce((draft: Record<string, Note[]>) => {
          const projId = Object.keys(draft).find((pid) =>
            draft[pid].some((n: Note) => n.id === noteId),
          );
          if (projId && draft[projId]) {
            const pNotes = draft[projId];
            const idx = pNotes.findIndex((n: Note) => n.id === noteId);
            if (idx !== -1) pNotes[idx].favourite = newFav;
          }
        }),
      );

      if (vaultPath) {
        await ipc.invoke("db:saveNote", vaultPath, updated);
      }
    },
    [allNotesFlat, setAllNotesMap, vaultPath],
  );

  const handleUndoDelete = useCallback(async () => {
    const undoData = (window as any).__undoDelete;
    if (!undoData) return;

    clearTimeout(undoData.undoTimeout);

    // We expect the toast library (sonner) handles dismiss or we don't care
    setDeletePendingNoteId(null);

    if (undoData.projId && undoData.noteToDelete) {
      setAllNotesMap(
        produce((draft: Record<string, Note[]>) => {
          if (!draft[undoData.projId]) draft[undoData.projId] = [];
          draft[undoData.projId].unshift(undoData.noteToDelete);
        }),
      );
    }

    (window as any).__undoDelete = null;
    showToast("Deletion undone ✓", "success");
  }, [setAllNotesMap, showToast]);

  return {
    projects,
    setProjects,
    activeProjectId,
    allNotesMap,
    setAllNotesMap,
    graphData,
    setGraphData,
    focusedNoteId,
    setFocusedNoteId,
    graphSelectedProjects,
    setGraphSelectedProjects,
    activePdf,
    setActivePdf,
    viewingCommitHash,
    setViewingCommitHash,
    historicalContent,
    setHistoricalContent,
    noteHistory,
    setNoteHistory,
    activeHistoryNote,
    setActiveHistoryNote,
    vaultHistory,
    setVaultHistory,
    loadDataFromVault,
    activeProject,
    isRootProject,
    rootProject,
    notes,
    setNotes,
    allNotesFlat,
    handleAddProject,
    handleAddChapter,
    handleAddNote,
    selectProject,
    handleDeleteNote,
    toggleGraphProject,
    deletePendingNoteId,
    toggleFavourite,
    handleUndoDelete,
    setActiveProjectId,
    handleArchiveProject,
    handleUnarchiveProject,
  };
}
