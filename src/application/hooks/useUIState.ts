import { ipcClient } from "@/api/ipcClient";
import { useState, useCallback } from "react";
import type { Note } from "../../domain/models";
import { produce } from "immer";
import { nanoid } from "nanoid";
import { getLocalDateString } from "../../utils/dateUtils";
import { useUIStore } from "../store/uiStore";
import { useReviewStore } from "../store/reviewStore";

export function useUIState(
  vaultPath: string | null,
  allNotesMap: Record<string, Note[]>,
  setAllNotesMap: any,
  activeProjectId: string | null,
  handleSync: () => Promise<void>,
  setNoteHistory: any,
  setActiveHistoryNote: any,
  setViewingCommitHash: any,
  setHistoricalContent: any,
  viewingCommitHash: string | null,
  historicalContent: string | null,
) {
  const showToast = useUIStore((s) => s.showToast);
  const setIsHistoryOpen = useUIStore((s) => s.setIsHistoryOpen);

  const [isAppReady, setIsAppReady] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteTags, setNewNoteTags] = useState("");
  const [newNoteDate, setNewNoteDate] = useState(getLocalDateString());
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProjects, setExpandedProjects] = useState<
    Record<string, boolean>
  >({});
  const [addingChapterTo, setAddingChapterTo] = useState<string | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteTitle, setEditNoteTitle] = useState("");
  const [editNoteContent, setEditNoteContent] = useState("");
  const [editFlashcardQ, setEditFlashcardQ] = useState("");
  const [editFlashcardA, setEditFlashcardA] = useState("");
  const [editNoteTags, setEditNoteTags] = useState("");

  const [newProjectName, setNewProjectName] = useState("");
  const [newChapterName, setNewChapterName] = useState("");
  const [confirmRestoreNote, setConfirmRestoreNote] = useState<Note | null>(
    null,
  );

  const handleOpenHistory = useCallback(
    async (note: Note) => {
      if (!vaultPath) return;
      try {
        const history = await ipcClient.git.getFileHistory(vaultPath, note.id);
        setNoteHistory(history);
        setActiveHistoryNote(note);
        setIsHistoryOpen(true);
        setViewingCommitHash(null);
        setHistoricalContent(null);
      } catch (e: any) {
        showToast("Failed to load history: " + e.message, "error");
      }
    },
    [
      vaultPath,
      setNoteHistory,
      setActiveHistoryNote,
      setIsHistoryOpen,
      setViewingCommitHash,
      setHistoricalContent,
      showToast,
    ],
  );

  const handleViewCommit = useCallback(
    async (noteId: string, hash: string) => {
      if (!vaultPath) return;
      try {
        const res = await ipcClient.git.getFileContentAtCommit(
          vaultPath,
          noteId,
          hash,
        );
        if (res.success) {
          setHistoricalContent(typeof res.data === "string" ? res.data : "");
        } else {
          setHistoricalContent("");
          showToast("Failed to load commit: " + res.error, "error");
        }
        setViewingCommitHash(hash);
      } catch (e: any) {
        showToast("Failed to load commit: " + e.message, "error");
      }
    },
    [vaultPath, setHistoricalContent, setViewingCommitHash, showToast],
  );

  const handleRestoreCommit = useCallback(
    async (note: Note) => {
      if (!vaultPath || !viewingCommitHash || !historicalContent) return;
      try {
        const updatedNote = { ...note, content: historicalContent };
        await ipcClient.db.saveNote(vaultPath, updatedNote);
        setAllNotesMap((prev: Record<string, Note[]>) => {
          const pId =
            Object.keys(prev).find((pid) =>
              prev[pid].some((n) => n.id === note.id),
            ) || activeProjectId;
          if (!pId) return prev;
          return {
            ...prev,
            [pId]: prev[pId].map((n) => (n.id === note.id ? updatedNote : n)),
          };
        });
        await handleSync();
        setIsHistoryOpen(false);
        showToast("Restored from history", "success");
      } catch (e: any) {
        showToast("Failed to restore: " + e.message, "error");
      }
    },
    [
      vaultPath,
      viewingCommitHash,
      historicalContent,
      handleSync,
      setAllNotesMap,
      activeProjectId,
      setIsHistoryOpen,
      showToast,
    ],
  );

  const saveEdit = useCallback(
    async (close = true, overrideContent?: string) => {
      const contentToSave =
        overrideContent !== undefined ? overrideContent : editNoteContent;

      let finalTitle = editNoteTitle;
      if (finalTitle === "New Note" || !finalTitle.trim()) {
        const match = contentToSave.match(/^#\s+(.*)$/m);
        if (match && match[1]) {
          finalTitle = match[1].trim();
          setEditNoteTitle(finalTitle);
        } else {
          finalTitle = finalTitle || "Untitled Note";
        }
      }

      let updatedNote: any = null;
      let fullNoteForIpc: any = null;
      setAllNotesMap((prev: any) => {
        const draft = { ...prev };
        let targetProjectId = activeProjectId;
        let idx = -1;

        if (targetProjectId && draft[targetProjectId]) {
          idx = draft[targetProjectId].findIndex(
            (n: any) => n.id === editingNoteId,
          );
        }

        if (idx === -1) {
          for (const pid of Object.keys(draft)) {
            const foundIdx = draft[pid].findIndex(
              (n: any) => n.id === editingNoteId,
            );
            if (foundIdx !== -1) {
              targetProjectId = pid;
              idx = foundIdx;
              break;
            }
          }
        }

        if (targetProjectId && idx !== -1) {
          const arr = [...draft[targetProjectId]];
          arr[idx] = { ...arr[idx], title: finalTitle };
          arr[idx].tags = editNoteTags
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean);

          if (editFlashcardQ.trim() && editFlashcardA.trim()) {
            arr[idx].flashcard = {
              ...arr[idx].flashcard,
              question: editFlashcardQ,
              answer: editFlashcardA,
              nextReviewDate:
                arr[idx].flashcard?.nextReviewDate || getLocalDateString(),
              interval: arr[idx].flashcard?.interval || 0,
              easeFactor: arr[idx].flashcard?.easeFactor || 2.5,
              repetition: arr[idx].flashcard?.repetition || 0,
            };
          } else {
            delete arr[idx].flashcard;
          }
          fullNoteForIpc = { ...arr[idx], content: contentToSave };
          arr[idx].content = contentToSave;
          updatedNote = arr[idx];
          draft[targetProjectId] = arr;
        }
        return draft;
      });

      if (fullNoteForIpc && vaultPath) {
        ipcClient.db
          .saveNote(vaultPath, fullNoteForIpc)
          .then(async (res: any) => {
            if (res.success && res.formattedContent !== undefined) {
              setEditNoteContent(res.formattedContent);
            }
            // Log edit activity
            await ipcClient.db.logActivity(
              vaultPath,
              getLocalDateString(),
              "edit",
            );

            const logsRes = await ipcClient.db.getActivityLogs(vaultPath);
            useReviewStore.getState().setActivityLogs(logsRes?.data || []);
          })
          .catch((e: any) => {
            console.error("Failed to save note background", e);
          });
      }

      if (close) {
        setEditingNoteId(null);
      }
    },
    [
      editNoteTitle,
      editNoteContent,
      editNoteTags,
      editFlashcardQ,
      editFlashcardA,
      activeProjectId,
      editingNoteId,
      setAllNotesMap,
      vaultPath,
    ],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLTextAreaElement>, isEditing: boolean) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (
        !file ||
        !(file.type.startsWith("image/") || file.type === "application/pdf")
      )
        return;

      if (vaultPath) {
        const projId = isEditing
          ? Object.values(allNotesMap)
              .flat()
              .find((n: Note) => n.id === editingNoteId)?.project_id
          : activeProjectId;

        try {
          const buffer = await file.arrayBuffer();
          const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
          const res = await ipcClient.fs.saveAsset(
            vaultPath,
            `${Math.random().toString(36).substring(7)}_${sanitizedName}`,
            buffer,
            projId,
          );

          if (res.success) {
            const isPdf = file.type === "application/pdf";
            const markdownAsset = `\n${isPdf ? "" : "!"}[${file.name}](${encodeURI(res.url)})\n`;

            if (isEditing) {
              setEditNoteContent((prev) => prev + markdownAsset);
            } else {
              setNewNoteContent((prev) => prev + markdownAsset);
            }
          }
        } catch (e: any) {
          showToast("Failed to save asset: " + e.message, "error");
        }
      }
    },
    [vaultPath, allNotesMap, editingNoteId, activeProjectId, showToast],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
    },
    [],
  );

  const startEditing = useCallback(
    async (note: Note) => {
      // Flush any pending edits for the current note immediately before switching context
      if (editingNoteId && editingNoteId !== note.id) {
        saveEdit(true);
      }
      setEditingNoteId(note.id);
      setEditNoteTitle(note.title);
      setEditFlashcardQ(note.flashcard?.question || "");
      setEditFlashcardA(note.flashcard?.answer || "");
      setEditNoteTags((note.tags || []).join(", "));

      if (note.content !== undefined && note.content !== "") {
        setEditNoteContent(note.content);
      } else if (vaultPath && note.id) {
        setEditNoteContent("Loading...");
        const res = await ipcClient.db.getNoteContent(vaultPath, note.id);
        if (res.success && res.data) {
          setEditNoteContent(res.data);

          setAllNotesMap((prev: any) => {
            const map = { ...prev };
            const projId = (note as any).project_id || note.chapterId;
            if (map[projId]) {
              map[projId] = map[projId].map((n: Note) =>
                n.id === note.id ? { ...n, content: res.data } : n,
              );
            }
            return map;
          });
        } else {
          setEditNoteContent("");
        }
      } else {
        setEditNoteContent("");
      }
    },
    [vaultPath, setAllNotesMap, editingNoteId, saveEdit],
  );

  const confirmRestore = useCallback(async () => {
    const note = confirmRestoreNote;
    if (!note || !historicalContent || !vaultPath) return;
    setConfirmRestoreNote(null);
    const restoredNote = { ...note, content: historicalContent };
    await ipcClient.db.saveNote(vaultPath, restoredNote);

    setAllNotesMap((prev: any) => {
      const draft = { ...prev };
      const projId = Object.keys(draft).find((pid) =>
        draft[pid].some((n: Note) => n.id === note.id),
      );
      if (projId && draft[projId]) {
        const arr = [...draft[projId]];
        const idx = arr.findIndex((n: Note) => n.id === note.id);
        if (idx !== -1) {
          arr[idx] = restoredNote;
          draft[projId] = arr;
        }
      }
      return draft;
    });

    setIsHistoryOpen(false);
    setViewingCommitHash(null);
    setHistoricalContent(null);
    showToast("Note restored to historical version ✓", "success");
  }, [
    confirmRestoreNote,
    historicalContent,
    vaultPath,
    setAllNotesMap,
    setIsHistoryOpen,
    setViewingCommitHash,
    setHistoricalContent,
    showToast,
  ]);

  return {
    isAppReady,
    setIsAppReady,
    newNoteContent,
    setNewNoteContent,
    newNoteTitle,
    setNewNoteTitle,
    newNoteTags,
    setNewNoteTags,
    newNoteDate,
    setNewNoteDate,
    searchQuery,
    setSearchQuery,
    expandedProjects,
    setExpandedProjects,
    trashOpen,
    setTrashOpen,
    editingNoteId,
    setEditingNoteId,
    editNoteTitle,
    setEditNoteTitle,
    editNoteContent,
    setEditNoteContent,
    editFlashcardQ,
    setEditFlashcardQ,
    editFlashcardA,
    setEditFlashcardA,
    editNoteTags,
    setEditNoteTags,
    newProjectName,
    setNewProjectName,
    addingChapterTo,
    setAddingChapterTo,
    newChapterName,
    setNewChapterName,
    confirmRestoreNote,
    setConfirmRestoreNote,
    handleOpenHistory,
    handleViewCommit,
    handleRestoreCommit,
    saveEdit,
    handleDrop,
    handleDragOver,
    startEditing,
    confirmRestore,
  };
}
