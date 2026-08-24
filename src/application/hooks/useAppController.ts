import { useState, useRef } from "react";
import {
  useVault,
  useNotes,
  useUI,
  useReview,
} from "../../application/context";
import { getLocalDateString } from "../../utils/dateUtils";

export function useAppController() {
  const vault = useVault();
  const notes = useNotes();
  const ui = useUI();
  const review = useReview();

  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const fgRef = useRef<any>(null);

  const getFormattedDate = (dateStr: string) => {
    if (!dateStr) return "";
    const today = getLocalDateString();
    const yesterdayDate = new Date(Date.now() - 86400000);
    const yesterday = getLocalDateString(yesterdayDate);
    if (dateStr === today) return "Today";
    if (dateStr === yesterday) return "Yesterday";
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return {
    ...vault,
    ...notes,
    ...ui,
    ...review,
    selectedNotes,
    setSelectedNotes,
    fgRef,
    getFormattedDate,
  };
}
