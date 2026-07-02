import {
  Settings,
  Hash,
  NotebookPen,
  CircleDashed,
  RefreshCw,
  Send,
  Star,
  X,
  History,
  LayoutGrid,
  ChevronDown,
  FileText,
} from "lucide-react";
import { lazy, Suspense } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";

import { CmdKPalette } from "./CmdKPalette";
import { NoteEditor } from "./NoteEditor";
import { TopBar } from "./TopBar";
import { RightSidebar } from "./RightSidebar";
import { LeftSidebar } from "./LeftSidebar";
import { VaultHistoryModal } from "./VaultHistoryModal";
import { WelcomeScreen } from "./dashboard/WelcomeScreen";
import { NewBookModal } from "./NewBookModal";
import { BooksLibrary } from "./BooksLibrary";
import { NewCourseModal } from "./NewCourseModal";
import { NewChapterModal } from "./NewChapterModal";
import { CoursesLibrary } from "./CoursesLibrary";
import { ErrorBoundary } from "./ErrorBoundary";

import { AppTab } from "../domain/enums/AppTab";
import { Tooltip } from "./Tooltip";
import { Command } from "cmdk";
import { BarChart } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const ForceGraph2D = lazy(() => import("react-force-graph-2d"));
const PdfViewerModal = lazy(() =>
  import("./PdfViewerModal").then((module) => ({
    default: module.PdfViewerModal,
  })),
);
const SettingsModal = lazy(() =>
  import("./SettingsModal").then((module) => ({
    default: module.SettingsModal,
  })),
);
const HistoryModal = lazy(() =>
  import("./HistoryModal").then((module) => ({
    default: module.HistoryModal,
  })),
);
const CheatsheetModal = lazy(() =>
  import("./CheatsheetModal").then((module) => ({
    default: module.CheatsheetModal,
  })),
);
const FlashcardReview = lazy(() =>
  import("./FlashcardReview").then((module) => ({
    default: module.FlashcardReview,
  })),
);
const ActivityCalendar = lazy(() =>
  import("react-activity-calendar").then((module) => ({
    default: module.ActivityCalendar,
  })),
);
import { useAppController } from "../application/hooks/useAppController";

export function AppContent() {
  const {
    vaultPath,
    vaultSettings,
    isAppReady,
    isSyncingVault,
    projects,
    allNotesMap,
    activeProject,
    isRootProject,
    rootProject,
    allNotesFlat,
    graphSelectedProjects,
    setActivePdf,
    splitPaneNoteId,
    setSplitPaneNoteId,
    handleAddNote,
    newNoteDate,
    setNewNoteDate,
    newNoteContent,
    setNewNoteContent,
    newNoteTitle,
    setNewNoteTitle,
    newNoteTags,
    setNewNoteTags,
    handleSelectVault,
    selectProject,
    graphData,
    confirmRestore,
    toggleGraphProject,
    activeTab,
    cmdkOpen,
    setCmdkOpen,
    zenMode,
    setZenMode,
    projectViewMode,
    setProjectViewMode,
    confirmRestoreNote,
    setConfirmRestoreNote,
    startEditing,
    handleDrop,
    handleDragOver,
    activityLogs,
    reviewMode,
    sidebarCollapsed,
    rightSidebarCollapsed,
    setReviewMode,
    dueReviewNotes,
    fgRef,
    setSettingsOpen,
  } = useAppController();

  if (isAppReady && !vaultPath) {
    return <WelcomeScreen onSelectVault={handleSelectVault} />;
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-full bg-background text-foreground font-sans selection:bg-[#eab308] selection:text-white">
        {/* Restore Confirmation Modal */}
        {confirmRestoreNote && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card rounded-2xl shadow-2xl border border-border p-8 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-foreground mb-2">
                Restore Historical Version?
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                This will overwrite the current note content with the selected
                historical version. This cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmRestoreNote(null)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRestore}
                  className="px-4 py-2 text-sm font-medium bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors"
                >
                  Restore Version
                </button>
              </div>
            </div>
          </div>
        )}

        <Command.Dialog
          open={cmdkOpen}
          onOpenChange={setCmdkOpen}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="bg-card rounded-xl shadow-2xl border border-border w-full max-w-2xl overflow-hidden flex flex-col">
            <Command.Input
              placeholder="Search notes or type a command..."
              className="w-full px-4 py-4 bg-transparent border-b border-gray-100 dark:border-zinc-800 outline-none text-lg text-gray-900 dark:text-white placeholder:text-gray-400"
            />
            <Command.List className="max-h-[300px] overflow-y-auto p-2">
              <Command.Empty className="py-6 text-center text-gray-500 text-sm">
                No results found.
              </Command.Empty>

              <Command.Group
                heading="Notes"
                className="text-xs font-semibold text-muted-foreground px-2 py-1"
              >
                {allNotesFlat.map((note: any) => (
                  <Command.Item
                    key={note.id}
                    onSelect={() => {
                      const el = document.getElementById("note-" + note.id);
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                      setCmdkOpen(false);
                    }}
                    className="flex items-center px-2 py-2 rounded-lg cursor-pointer hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <NotebookPen size={14} className="mr-2 text-gray-400" />
                    <span className="text-sm font-medium">{note.title}</span>
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group
                heading="Commands"
                className="text-xs font-semibold text-muted-foreground px-2 py-1 mt-2"
              >
                <Command.Item
                  onSelect={() => {
                    setSettingsOpen(true);
                    setCmdkOpen(false);
                  }}
                  className="flex items-center px-2 py-2 rounded-lg cursor-pointer hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  <Settings size={14} className="mr-2 text-gray-400" />
                  <span className="text-sm font-medium">Open Settings</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => {
                    setReviewMode(true);
                    setCmdkOpen(false);
                  }}
                  className="flex items-center px-2 py-2 rounded-lg cursor-pointer hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  <History size={14} className="mr-2 text-gray-400" />
                  <span className="text-sm font-medium">
                    Start Review Session
                  </span>
                </Command.Item>
              </Command.Group>
            </Command.List>
          </div>
        </Command.Dialog>
        <LeftSidebar />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-row bg-background overflow-hidden relative">
          <div className="flex-1 flex flex-col overflow-y-auto relative">
            {!isAppReady || isSyncingVault ? (
              <div className="h-screen flex flex-col p-10 max-w-4xl mx-auto w-full gap-8 bg-background">
                <div className="flex items-center gap-4 mb-4">
                  <Skeleton circle width={48} height={48} />
                  <Skeleton width={200} height={32} />
                </div>
                <Skeleton height={40} />
                <Skeleton height={20} count={4} />
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Skeleton height={150} />
                  <Skeleton height={150} />
                </div>
              </div>
            ) : reviewMode ? (
              <FlashcardReview />
            ) : (
              <>
                <TopBar />

                <div
                  className={`px-10 py-6 space-y-6 mx-auto w-full pb-20 ${
                    zenMode
                      ? "max-w-none"
                      : sidebarCollapsed && rightSidebarCollapsed
                        ? "max-w-screen-xl"
                        : sidebarCollapsed || rightSidebarCollapsed
                          ? "max-w-6xl"
                          : "max-w-4xl"
                  }`}
                >
                  {activeTab === AppTab.PROJECT &&
                  projectViewMode === "toc" &&
                  isRootProject ? (
                    <div className="bg-card rounded-xl shadow-sm border border-border p-8">
                      <h2 className="text-xl font-bold mb-6 text-foreground flex items-center">
                        <NotebookPen
                          className="mr-2 text-[#007aff]"
                          size={20}
                        />{" "}
                        Table of Contents
                      </h2>
                      <div className="space-y-6">
                        {rootProject?.chapters?.map((chapter: any) => {
                          let chapterNotes = allNotesMap[chapter.id] || [];
                          // Sort pinned notes to the top
                          chapterNotes = [...chapterNotes].sort(
                            (a: any, b: any) => {
                              if (a.favourite && !b.favourite) return -1;
                              if (!a.favourite && b.favourite) return 1;
                              return 0;
                            },
                          );
                          return (
                            <div key={chapter.id}>
                              <h3
                                onClick={() =>
                                  selectProject(rootProject.id, chapter.id)
                                }
                                className="text-lg font-bold text-foreground hover:text-[#007aff] dark:hover:text-[#007aff] transition-colors cursor-pointer flex items-center mb-3"
                              >
                                <CircleDashed
                                  size={16}
                                  className="mr-2 text-[#007aff]"
                                />{" "}
                                {chapter.name}
                              </h3>
                              <ul className="pl-6 space-y-2.5 border-l-2 border-gray-100 dark:border-gray-800 ml-2">
                                {chapterNotes.length === 0 ? (
                                  <li className="text-sm text-muted-foreground/60 italic flex items-center">
                                    <FileText
                                      size={14}
                                      className="mr-2 opacity-50"
                                    />
                                    Empty chapter
                                  </li>
                                ) : (
                                  chapterNotes.map((n: any) => (
                                    <li key={n.id}>
                                      <button
                                        onClick={() => {
                                          setProjectViewMode("linear");
                                          setTimeout(
                                            () =>
                                              document
                                                .getElementById("note-" + n.id)
                                                ?.scrollIntoView({
                                                  behavior: "smooth",
                                                  block: "center",
                                                }),
                                            100,
                                          );
                                        }}
                                        className="text-[14px] text-muted-foreground hover:text-[#007aff] transition-colors text-left flex items-start group"
                                      >
                                        <span className="flex-1 flex items-center">
                                          {n.favourite && (
                                            <Star
                                              size={12}
                                              className="mr-1.5 fill-[#eab308] text-[#eab308]"
                                            />
                                          )}
                                          {n.title}
                                        </span>
                                      </button>
                                    </li>
                                  ))
                                )}
                              </ul>
                            </div>
                          );
                        })}
                        {(allNotesMap[activeProject?.id] || []).length > 0 && (
                          <div className="pt-4 mt-8 border-t border-gray-100 dark:border-gray-800">
                            <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-4">
                              Uncategorized Notes
                            </h3>
                            <ul className="pl-6 space-y-2.5 border-l-2 border-gray-100 dark:border-gray-800 ml-2">
                              {[...(allNotesMap[activeProject?.id] || [])]
                                .sort((a: any, b: any) => {
                                  if (a.favourite && !b.favourite) return -1;
                                  if (!a.favourite && b.favourite) return 1;
                                  return 0;
                                })
                                .map((n: any) => (
                                  <li key={n.id}>
                                    <button
                                      onClick={() => {
                                        setProjectViewMode("linear");
                                        setTimeout(
                                          () =>
                                            document
                                              .getElementById("note-" + n.id)
                                              ?.scrollIntoView({
                                                behavior: "smooth",
                                                block: "center",
                                              }),
                                          100,
                                        );
                                      }}
                                      className="text-[14px] text-muted-foreground hover:text-[#007aff] transition-colors text-left flex items-start group"
                                    >
                                      <span className="flex-1 flex items-center">
                                        {n.favourite && (
                                          <Star
                                            size={12}
                                            className="mr-1.5 fill-[#eab308] text-[#eab308]"
                                          />
                                        )}
                                        {n.title}
                                      </span>
                                    </button>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : activeTab === AppTab.BOOKS ? (
                    <BooksLibrary />
                  ) : activeTab === AppTab.COURSES ? (
                    <CoursesLibrary />
                  ) : activeTab === AppTab.ANALYTICS ? (
                    <div className="flex flex-col h-full bg-card p-8 overflow-y-auto">
                      <div className="flex items-center mb-10">
                        <BarChart size={32} className="text-indigo-500 mr-4" />
                        <div>
                          <h1 className="text-3xl font-bold text-foreground tracking-tight">
                            Your Analytics
                          </h1>
                          <p className="text-gray-500 mt-1">
                            Track your studying, learning progress, and vault
                            stats.
                          </p>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col justify-between">
                          <div className="text-muted-foreground text-sm font-semibold mb-2">
                            Total Notes
                          </div>
                          <div className="text-4xl font-black text-foreground">
                            {allNotesFlat.length}
                          </div>
                        </div>
                        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col justify-between">
                          <div className="text-muted-foreground text-sm font-semibold mb-2">
                            Total Flashcards
                          </div>
                          <div className="text-4xl font-black text-blue-500">
                            {
                              allNotesFlat.filter((n: any) => !!n.flashcard)
                                .length
                            }
                          </div>
                        </div>
                        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col justify-between">
                          <div className="text-muted-foreground text-sm font-semibold mb-2">
                            Books Library
                          </div>
                          <div className="text-4xl font-black text-blue-500">
                            {
                              projects.filter((p: any) => p.type === "book")
                                .length
                            }
                          </div>
                        </div>
                        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col justify-between">
                          <div className="text-muted-foreground text-sm font-semibold mb-2">
                            Courses Library
                          </div>
                          <div className="text-4xl font-black text-purple-500">
                            {
                              projects.filter((p: any) => p.type === "course")
                                .length
                            }
                          </div>
                        </div>
                      </div>

                      {/* SRS Status panel */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-800/30 flex items-center justify-between">
                          <div>
                            <div className="text-indigo-600 dark:text-indigo-400 font-semibold mb-1">
                              Due for Review Today
                            </div>
                            <p className="text-sm text-indigo-500/80 dark:text-indigo-400/80">
                              Flashcards waiting for spaced repetition.
                            </p>
                          </div>
                          <div className="text-5xl font-black text-indigo-600 dark:text-indigo-400">
                            {dueReviewNotes.length}
                          </div>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-800/30 flex items-center justify-between">
                          <div>
                            <div className="text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
                              Total Reviews Completed
                            </div>
                            <p className="text-sm text-emerald-500/80 dark:text-emerald-400/80">
                              Total reps across all your flashcards.
                            </p>
                          </div>
                          <div className="text-5xl font-black text-emerald-600 dark:text-emerald-400">
                            {allNotesFlat.reduce(
                              (acc: number, note: any) =>
                                acc + (note.flashcard?.repetition || 0),
                              0,
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="bg-card rounded-xl shadow-sm border border-border p-8 mb-8">
                        <h3 className="text-lg font-bold mb-6 text-foreground">
                          Contribution Heatmap
                        </h3>
                        <div className="overflow-x-auto pb-4">
                          <ActivityCalendar
                            data={
                              activityLogs.length > 0
                                ? activityLogs.map((l: any) => ({
                                    date: l.date,
                                    count: l.count,
                                    level: Math.min(4, Math.ceil(l.count / 2)),
                                  }))
                                : [
                                    {
                                      date: new Date()
                                        .toISOString()
                                        .split("T")[0],
                                      count: 0,
                                      level: 0,
                                    },
                                  ]
                            }
                            theme={{
                              light: [
                                "#ebedf0",
                                "#9be9a8",
                                "#40c463",
                                "#30a14e",
                                "#216e39",
                              ],
                              dark: [
                                "#333336",
                                "#0e4429",
                                "#006d32",
                                "#26a641",
                                "#39d353",
                              ],
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : activeTab === AppTab.GRAPH ? (
                    <div className="flex flex-col h-full gap-4">
                      <div className="relative z-20">
                        <details className="group relative w-fit">
                          <summary className="list-none cursor-pointer bg-card border border-border px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                            Select Projects
                            <ChevronDown
                              size={16}
                              className="text-gray-500 group-open:rotate-180 transition-transform"
                            />
                          </summary>
                          <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-xl max-h-64 overflow-y-auto p-2 flex flex-col gap-1">
                            {projects
                              .filter(
                                (p: any) =>
                                  p.type === "book" || p.type === "course",
                              )
                              .map((p: any) => (
                                <label
                                  key={p.id}
                                  className="flex items-center gap-2 p-2 hover:bg-accent hover:text-accent-foreground rounded-lg cursor-pointer text-sm"
                                >
                                  <input
                                    type="checkbox"
                                    checked={graphSelectedProjects.has(p.id)}
                                    onChange={() => toggleGraphProject(p.id)}
                                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                  />
                                  <div
                                    className={`w-2 h-2 rounded-full ${p.color}`}
                                  ></div>
                                  <span className="truncate">{p.name}</span>
                                </label>
                              ))}
                          </div>
                        </details>
                      </div>
                      <div className="h-[600px] bg-card rounded-xl shadow-sm border border-border overflow-hidden flex items-center justify-center relative">
                        <div className="absolute top-4 right-4 z-10 flex flex-col gap-1 bg-card p-1 rounded-md shadow border border-border">
                          <Tooltip content="Zoom In" side="left">
                            <button
                              onClick={() => {
                                if (fgRef.current) {
                                  const currentZoom = fgRef.current.zoom();
                                  fgRef.current.zoom(currentZoom * 1.5, 400);
                                }
                              }}
                              className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-accent hover:text-accent-foreground rounded transition-colors text-lg font-bold"
                            >
                              +
                            </button>
                          </Tooltip>
                          <Tooltip content="Zoom Out" side="left">
                            <button
                              onClick={() => {
                                if (fgRef.current) {
                                  const currentZoom = fgRef.current.zoom();
                                  fgRef.current.zoom(currentZoom / 1.5, 400);
                                }
                              }}
                              className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-accent hover:text-accent-foreground rounded transition-colors text-xl font-bold"
                            >
                              -
                            </button>
                          </Tooltip>
                        </div>
                        {graphSelectedProjects.size === 0 ? (
                          <div className="text-gray-400 font-medium">
                            Select a book or course above to view its graph.
                          </div>
                        ) : (
                          <Suspense
                            fallback={
                              <div className="text-gray-400 font-medium">
                                Loading graph engine...
                              </div>
                            }
                          >
                            <ErrorBoundary
                              fallback={
                                <div className="p-8 text-center text-gray-500">
                                  Graph engine failed to load.
                                </div>
                              }
                            >
                              <ForceGraph2D
                                ref={fgRef}
                                onNodeClick={(node: any) => {
                                  if (node.type === "note" && node.project_id) {
                                    selectProject(
                                      node.project_id,
                                      node.chapter_id,
                                    );
                                    setTimeout(() => {
                                      const noteObj = allNotesFlat.find(
                                        (n: any) => n.id === node.id,
                                      );
                                      if (noteObj) startEditing(noteObj);
                                    }, 100);
                                  }
                                }}
                                width={Math.min(window.innerWidth - 320, 900)}
                                height={Math.max(window.innerHeight - 200, 400)}
                                backgroundColor={
                                  document.documentElement.classList.contains(
                                    "dark",
                                  )
                                    ? "#252528"
                                    : "#ffffff"
                                }
                                nodeAutoColorBy="group"
                                nodeCanvasObject={(
                                  node: any,
                                  ctx,
                                  globalScale,
                                ) => {
                                  if (
                                    node.x === undefined ||
                                    node.y === undefined
                                  )
                                    return;
                                  const label = node.name;
                                  const fontSize = 12 / globalScale;
                                  ctx.font = `${fontSize}px Sans-Serif`;
                                  const textWidth =
                                    ctx.measureText(label).width;
                                  const bckgDimensions = [
                                    textWidth,
                                    fontSize,
                                  ].map((n: any) => n + fontSize * 0.2);
                                  ctx.fillStyle =
                                    document.documentElement.classList.contains(
                                      "dark",
                                    )
                                      ? "#333336"
                                      : "#f4f4f5";
                                  ctx.fillRect(
                                    node.x - bckgDimensions[0] / 2,
                                    node.y - bckgDimensions[1] / 2,
                                    bckgDimensions[0],
                                    bckgDimensions[1],
                                  );
                                  ctx.textAlign = "center";
                                  ctx.textBaseline = "middle";
                                  ctx.fillStyle =
                                    node.group === "tag"
                                      ? "#007aff"
                                      : document.documentElement.classList.contains(
                                            "dark",
                                          )
                                        ? "#ffffff"
                                        : "#1c1c1e";
                                  ctx.fillText(label, node.x, node.y);
                                }}
                                graphData={graphData}
                              />
                            </ErrorBoundary>
                          </Suspense>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Add Note Area */}
                      {activeTab === AppTab.PROJECT && activeProject && (
                        <div className="bg-card rounded-xl shadow-sm border border-border p-4 flex flex-col gap-3 transition-shadow focus-within:shadow-md focus-within:border-[#007aff]/50">
                          <input
                            type="text"
                            value={newNoteTitle}
                            onChange={(e) => setNewNoteTitle(e.target.value)}
                            placeholder="Note Title..."
                            className="w-full bg-transparent border-none outline-none font-bold text-lg text-foreground placeholder-gray-400"
                          />
                          <textarea
                            value={newNoteContent}
                            onChange={(e) => setNewNoteContent(e.target.value)}
                            onDrop={(e) => handleDrop(e, false)}
                            onDragOver={handleDragOver}
                            placeholder="Write a new note in markdown... (Drop images here)"
                            className="w-full bg-transparent border-none outline-none resize-none min-h-[60px] text-[15px] text-muted-foreground placeholder-gray-400/70"
                          />
                          <div className="flex gap-2 items-center mt-1 mb-3 overflow-x-auto">
                            <span className="text-[10px] font-bold text-[#71717a] dark:text-gray-500 uppercase tracking-wider">
                              Templates
                            </span>
                            <button
                              onClick={() => {
                                setNewNoteTitle("Lecture Notes");
                                setNewNoteContent(
                                  "## Key Concepts\n- \n\n## Detailed Notes\n\n\n## Summary\n",
                                );
                              }}
                              className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-1 rounded hover:bg-accent hover:text-accent-foreground transition-colors whitespace-nowrap"
                            >
                              Lecture Notes
                            </button>
                            <button
                              onClick={() => {
                                setNewNoteTitle("Book Chapter Summary");
                                setNewNoteContent(
                                  "## Main Thesis\n\n\n## Key Arguments\n- \n\n## Quotes\n> ",
                                );
                              }}
                              className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-1 rounded hover:bg-accent hover:text-accent-foreground transition-colors whitespace-nowrap"
                            >
                              Book Chapter
                            </button>
                            <button
                              onClick={() => {
                                setNewNoteTitle("Problem Set Solution");
                                setNewNoteContent(
                                  "## Problem Statement\n\n\n## Approach\n\n\n## Solution / Code\n```python\n\n```",
                                );
                              }}
                              className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-1 rounded hover:bg-accent hover:text-accent-foreground transition-colors whitespace-nowrap"
                            >
                              Problem Set
                            </button>
                          </div>
                          <div className="flex justify-between items-center mt-1 border-t border-[#f4f4f5] dark:border-zinc-800 pt-3">
                            <div className="flex gap-2 w-2/3">
                              <input
                                type="date"
                                value={newNoteDate}
                                onChange={(e) => setNewNoteDate(e.target.value)}
                                className="bg-transparent border-none outline-none text-xs text-gray-500 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={newNoteTags}
                                onChange={(e) => setNewNoteTags(e.target.value)}
                                placeholder="Tags (comma separated)..."
                                className="bg-transparent border-none outline-none text-xs text-gray-500 w-full ml-2"
                              />
                            </div>
                            <button
                              onClick={() => handleAddNote(activeProject?.id!)}
                              disabled={!newNoteContent.trim()}
                              className="bg-[#007aff] text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                              <Send size={16} className="mr-2" /> Add Note
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Notes List */}
                      <div className="space-y-6">
                        {(() => {
                          const todayDate = new Date()
                            .toISOString()
                            .split("T")[0];
                          let displayNotes: any[] = [];
                          if (activeTab === "today") {
                            displayNotes = allNotesFlat.filter(
                              (n: any) => n.date === todayDate,
                            );
                          } else if (activeTab === AppTab.AGENDA) {
                            displayNotes = allNotesFlat.filter(
                              (n: any) => n.date > todayDate,
                            );
                          } else if (activeProject) {
                            if (isRootProject) {
                              displayNotes = [
                                ...(allNotesMap[activeProject.id] || []),
                                ...(activeProject.chapters || []).flatMap(
                                  (c: any) => allNotesMap[c.id] || [],
                                ),
                              ];
                            } else {
                              displayNotes =
                                allNotesMap[activeProject.id] || [];
                            }
                          }

                          // Sort pinned (favourite) notes to the top
                          displayNotes = [...displayNotes].sort(
                            (a: any, b: any) => {
                              if (a.favourite && !b.favourite) return -1;
                              if (!a.favourite && b.favourite) return 1;
                              return 0;
                            },
                          );
                          if (displayNotes.length === 0) {
                            return (
                              <div className="flex flex-col items-center justify-center py-32 text-muted-foreground bg-accent/20 rounded-xl border border-dashed border-border mt-8 mx-12">
                                <div className="bg-background p-4 rounded-full shadow-sm border border-border mb-4">
                                  <Hash
                                    size={32}
                                    className="text-muted-foreground/50"
                                  />
                                </div>
                                <h3 className="text-lg font-semibold text-foreground mb-1">
                                  It's quiet here...
                                </h3>
                                <p className="text-sm text-center max-w-sm">
                                  This project doesn't have any notes yet. Use
                                  the sidebar to create your first note.
                                </p>
                              </div>
                            );
                          }

                          return displayNotes.map((note: any) => (
                            <NoteEditor key={note.id} note={note} />
                          ));
                        })()}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          {splitPaneNoteId &&
            (() => {
              const splitNote = allNotesFlat.find(
                (n: any) => n.id === splitPaneNoteId,
              );
              if (!splitNote) return null;
              return (
                <div className="flex-1 flex flex-col overflow-y-auto bg-card border-l border-border">
                  <div className="sticky top-0 bg-card/80 dark:bg-card/80 backdrop-blur-md px-8 py-4 border-b border-border flex justify-between items-center z-10">
                    <h2 className="text-xl font-bold text-foreground">
                      {splitNote.title}
                    </h2>
                    <Tooltip content="Close Split Pane">
                      <button
                        onClick={() => setSplitPaneNoteId(null)}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-lg transition-colors text-gray-500"
                      >
                        <X size={16} />
                      </button>
                    </Tooltip>
                  </div>
                  <div className="flex-1 overflow-y-auto px-10 py-6">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-8">
                      {splitNote.title}
                    </h1>
                    <MarkdownRenderer content={splitNote.content} />
                  </div>{" "}
                </div>
              );
            })()}
        </main>

        <RightSidebar />

        <ErrorBoundary>
          <Suspense fallback={null}>
            <PdfViewerModal />
            <SettingsModal />
            <HistoryModal />
            <CheatsheetModal />
          </Suspense>
        </ErrorBoundary>

        <NewBookModal />
        <NewCourseModal />
        <NewChapterModal />
        <VaultHistoryModal />
        <CmdKPalette />
      </div>
    </ErrorBoundary>
  );
}
