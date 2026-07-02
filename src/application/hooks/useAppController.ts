import { useState, useRef } from "react";
import {
  useVault,
  useNotes,
  useUI,
  useReview,
} from "../../application/context";

export function useAppController() {
  const vault = useVault();
  const notes = useNotes();
  const ui = useUI();
  const review = useReview();

  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const fgRef = useRef<any>(null);

  const getFormattedDate = (dateStr: string) => {
    if (!dateStr) return "";
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];
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
