import { ipcClient } from "@/api/ipcClient";
import { useState, useCallback, useMemo, useEffect } from "react";
import type { Note } from "../../domain/models";
import { produce } from "immer";
import { getNextInterval, calculateNextSM2 } from "../../utils/sm2";
import { getLocalDateString } from "../../utils/dateUtils";

export function useReviewState(
  vaultPath: string | null,
  allNotesFlat: Note[],
  allNotesMap: Record<string, Note[]>,
  activeProjectId: string | null,
  setAllNotesMap: any,
) {
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  const todayStr = getLocalDateString();

  useEffect(() => {
    if (vaultPath) {
      ipcClient.db
        .getActivityLogs(vaultPath)
        .then((res) => {
          setActivityLogs(res?.data || []);
        })
        .catch((e) => console.error("Failed to load activity logs", e));
    }
  }, [vaultPath]);

  const allReviewNotes = useMemo(
    () => allNotesFlat.filter((n: Note) => n.flashcard),
    [allNotesFlat],
  );

  const dueReviewNotes = useMemo(
    () =>
      allReviewNotes.filter(
        (n: Note) =>
          !n.flashcard.nextReviewDate || n.flashcard.nextReviewDate <= todayStr,
      ),
    [allReviewNotes, todayStr],
  );

  const calculateNextInterval = useCallback((note: any, quality: number) => {
    return getNextInterval(note.flashcard || {}, quality);
  }, []);

  const formatInterval = useCallback((days: number) => {
    if (days <= 0) return "< 1d";
    if (days === 1) return "1d";
    return days + "d";
  }, []);

  const updateNoteSRS = useCallback(
    async (note: any, quality: number, explicitInterval?: number) => {
      const sm2Result = calculateNextSM2(note.flashcard || {}, quality);
      if (explicitInterval !== undefined) {
        sm2Result.interval = explicitInterval;
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + explicitInterval);
        sm2Result.nextReviewDate = getLocalDateString(nextDate);
      }
      const updatedNote = {
        ...note,
        flashcard: {
          ...note.flashcard,
          ...sm2Result,
        },
      };

      if (vaultPath) {
        await ipcClient.db.saveNote(vaultPath, updatedNote);
        await ipcClient.db.logActivity(
          vaultPath,
          getLocalDateString(),
          "review",
        );
        const logsRes2 = await ipcClient.db.getActivityLogs(vaultPath);
        setActivityLogs(logsRes2?.data || []);
      }

      const projId =
        Object.keys(allNotesMap).find((pid) =>
          allNotesMap[pid].some((n: Note) => n.id === note.id),
        ) || activeProjectId;

      if (projId) {
        setAllNotesMap(
          produce((draft: Record<string, Note[]>) => {
            const pNotes = draft[projId];
            if (pNotes) {
              const idx = pNotes.findIndex((n: Note) => n.id === note.id);
              if (idx !== -1) pNotes[idx] = updatedNote;
            }
          }),
        );
      }

      if (reviewIndex < dueReviewNotes.length - 1) {
        setReviewIndex((r) => r + 1);
        setRevealedCards(new Set());
      } else {
        setReviewMode(false);
      }
    },
    [
      vaultPath,
      allNotesMap,
      activeProjectId,
      setAllNotesMap,
      reviewIndex,
      dueReviewNotes.length,
    ],
  );

  const toggleCard = useCallback((noteId: string) => {
    setRevealedCards((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  }, []);

  return {
    reviewMode,
    setReviewMode,
    reviewIndex,
    setReviewIndex,
    revealedCards,
    setRevealedCards,
    activityLogs,
    setActivityLogs,
    dueReviewNotes,
    calculateNextInterval,
    formatInterval,
    updateNoteSRS,
    toggleCard,
  };
}
