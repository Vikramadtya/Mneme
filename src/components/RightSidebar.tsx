import React, { useState } from "react";
import {
  NotebookPen,
  ChevronLeft,
  ChevronRight,
  Calendar,
  BarChart,
} from "lucide-react";
import { useNotes, useUI, useReview } from "../application/context";

export function RightSidebar() {
  const allNotesFlat = useNotes((s) => s.allNotesFlat);
  const activeProject = useNotes((s) => s.activeProject);
  const isRootProject = useNotes((s) => s.isRootProject);
  const allNotesMap = useNotes((s) => s.allNotesMap);
  const focusedNoteId = useNotes((s) => s.focusedNoteId);
  const zenMode = useUI((s) => s.zenMode);
  const activeTab = useUI((s) => s.activeTab);
  const rightSidebarCollapsed = useUI((s) => s.rightSidebarCollapsed);
  const setRightSidebarCollapsed = useUI((s) => s.setRightSidebarCollapsed);
  const dueReviewNotes = useReview((s) => s.dueReviewNotes);
  const setReviewIndex = useReview((s) => s.setReviewIndex);
  const setRevealedCards = useReview((s) => s.setRevealedCards);
  const setReviewMode = useReview((s) => s.setReviewMode);

  // Calendar navigation state
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth()); // 0-indexed

  const goToPrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else setCalMonth((m) => m - 1);
  };
  const goToNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else setCalMonth((m) => m + 1);
  };

  // Statistics context
  let contextTitle = "Vault Statistics";
  let contextNotes = allNotesFlat;

  if (focusedNoteId) {
    const note = allNotesFlat.find((n: any) => n.id === focusedNoteId);
    if (note) {
      contextTitle = "Note Statistics";
      contextNotes = [note];
    }
  } else if (activeProject && activeTab === "project") {
    if (isRootProject) {
      contextTitle = "Book Statistics";
      contextNotes = [
        ...(allNotesMap[activeProject.id] || []),
        ...(activeProject.chapters || []).flatMap(
          (c: any) => allNotesMap[c.id] || [],
        ),
      ];
    } else {
      contextTitle = "Chapter Statistics";
      contextNotes = allNotesMap[activeProject.id] || [];
    }
  }

  // Word count from titles only (content is lazy-loaded and often empty in memory)
  const totalNotes = contextNotes.length;
  const totalFlashcards = contextNotes.filter(
    (n: any) => n.flashcard?.question,
  ).length;

  // Notes-by-date for calendar dots
  const notesByDate = React.useMemo(() => {
    const map: Record<string, number> = {};
    contextNotes.forEach((n: any) => {
      if (n.date) {
        map[n.date] = (map[n.date] || 0) + 1;
      }
    });
    return map;
  }, [contextNotes]);

  // Calendar grid
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const isCurrentMonth =
    calYear === now.getFullYear() && calMonth === now.getMonth();
  const todayDate = now.getDate();

  const calDays: React.ReactNode[] = [];
  for (let i = 0; i < firstDay; i++) calDays.push(<div key={`e-${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const noteCount = notesByDate[dateStr] || 0;
    const isToday = isCurrentMonth && d === todayDate;
    calDays.push(
      <div key={d} className="flex flex-col items-center justify-center py-1">
        <div
          className={`w-6 h-6 flex items-center justify-center rounded-full text-xs ${isToday ? "bg-[#eab308] text-white font-bold shadow-sm" : "hover:bg-[#e4e4e7] dark:hover:bg-[#333336] cursor-pointer text-foreground"}`}
        >
          {d}
        </div>
        {noteCount > 0 && (
          <div className="text-[9px] text-[#007aff] font-bold mt-0.5">
            {noteCount}
          </div>
        )}
      </div>,
    );
  }

  const monthLabel = new Date(calYear, calMonth, 1).toLocaleDateString(
    undefined,
    {
      month: "long",
      year: "numeric",
    },
  );

  return (
    <>
      {/* Right Sidebar */}
      {!zenMode && activeTab !== "graph" && (
        <aside
          className={`${rightSidebarCollapsed ? "w-[60px]" : "w-[320px] resize-x min-w-[200px] max-w-[500px]"} overflow-x-hidden bg-[#ececec] dark:bg-card border-l border-[#d4d4d8] dark:border-border flex flex-col flex-shrink-0 pt-12 pb-6 transition-all duration-300 relative group/rightsidebar`}
        >
          <button
            onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
            className="absolute top-3 left-3 p-1 rounded-xl text-gray-400 hover:text-zinc-800 dark:hover:text-gray-200 hover:bg-accent hover:text-accent-foreground opacity-0 group-hover/rightsidebar:opacity-100 transition-opacity z-10"
          >
            {rightSidebarCollapsed ? (
              <ChevronLeft size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>

          {rightSidebarCollapsed ? (
            <div className="flex flex-col items-center gap-6 mt-4">
              <Calendar
                size={18}
                className="text-gray-400 hover:text-zinc-800 dark:hover:text-gray-200 cursor-pointer"
                onClick={() => setRightSidebarCollapsed(false)}
              />
              <NotebookPen
                size={18}
                className="text-gray-400 hover:text-zinc-800 dark:hover:text-gray-200 cursor-pointer"
                onClick={() => setRightSidebarCollapsed(false)}
              />
              <BarChart
                size={18}
                className="text-gray-400 hover:text-zinc-800 dark:hover:text-gray-200 cursor-pointer"
                onClick={() => setRightSidebarCollapsed(false)}
              />
            </div>
          ) : (
            <>
              {/* Calendar */}
              <div className="px-6 mb-8">
                <h3 className="text-[11px] font-bold text-[#71717a] dark:text-gray-500 uppercase tracking-wider mb-4">
                  Calendar
                </h3>
                <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
                  {/* Month navigation */}
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={goToPrevMonth}
                      className="p-1 rounded-md hover:bg-accent hover:text-accent-foreground text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-xs font-bold text-foreground">
                      {monthLabel}
                    </span>
                    <button
                      onClick={goToNextMonth}
                      className="p-1 rounded-md hover:bg-accent hover:text-accent-foreground text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1 text-[10px] text-gray-400 mb-1 text-center">
                    {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                      <div key={i}>{d}</div>
                    ))}
                  </div>
                  {/* Day cells */}
                  <div className="grid grid-cols-7 gap-1 text-xs font-medium">
                    {calDays}
                  </div>
                </div>
              </div>

              {/* Flashcards */}
              <div className="px-6 mb-8">
                <h3 className="text-[11px] font-bold text-[#71717a] dark:text-gray-500 uppercase tracking-wider mb-4">
                  Flashcards
                </h3>
                <div className="bg-card rounded-lg border border-border p-4 text-center shadow-sm">
                  <NotebookPen
                    size={24}
                    className="text-[#eab308] mx-auto mb-2 opacity-80"
                  />
                  <p className="text-sm font-medium text-zinc-800 dark:text-gray-200">
                    {dueReviewNotes.length} Due Today
                  </p>
                  <p className="text-xs text-gray-500 mt-1 mb-3">
                    You have flashcards to review across all your notes.
                  </p>
                  <button
                    disabled={dueReviewNotes.length === 0}
                    onClick={() => {
                      setReviewIndex(0);
                      setRevealedCards(new Set());
                      setReviewMode(true);
                    }}
                    className="w-full bg-[#007aff] text-white rounded-md py-1.5 text-xs font-medium hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Start Review
                  </button>
                </div>
              </div>

              {/* Statistics */}
              <div className="px-6 mb-8">
                <h3 className="text-[11px] font-bold text-[#71717a] dark:text-gray-500 uppercase tracking-wider mb-4">
                  {contextTitle}
                </h3>
                <div className="bg-card rounded-lg border border-border p-4 shadow-sm flex flex-col gap-3">
                  {contextTitle !== "Note Statistics" && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-muted-foreground">
                        Total Notes
                      </span>
                      <span className="text-sm font-bold text-zinc-800 dark:text-gray-200">
                        {totalNotes}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-muted-foreground">
                      Notes This Month
                    </span>
                    <span className="text-sm font-bold text-zinc-800 dark:text-gray-200">
                      {Object.entries(notesByDate)
                        .filter(([date]) => {
                          const [y, m] = date.split("-").map(Number);
                          return (
                            y === now.getFullYear() && m === now.getMonth() + 1
                          );
                        })
                        .reduce((sum, [, count]) => sum + count, 0)}
                    </span>
                  </div>
                  {contextTitle !== "Note Statistics" && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-muted-foreground">
                        Flashcards
                      </span>
                      <span className="text-sm font-bold text-zinc-800 dark:text-gray-200">
                        {totalFlashcards}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-muted-foreground">
                      Due Reviews
                    </span>
                    <span className="text-sm font-bold text-zinc-800 dark:text-gray-200">
                      {dueReviewNotes.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-muted-foreground">
                      Active Days
                    </span>
                    <span className="text-sm font-bold text-zinc-800 dark:text-gray-200">
                      {Object.keys(notesByDate).length}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </aside>
      )}
    </>
  );
}
