import React, { useState, useRef, useEffect } from "react";
import {
  Settings,
  ChevronLeft,
  ChevronRight,
  Archive,
  Search,
  RefreshCw,
  Circle,
  Calendar,
  Network,
  PenTool,
  ChevronDown,
  CircleDashed,
  Square,
  Play,
  ExternalLink,
  GripVertical,
  PlusCircle,
  BarChart,
} from "lucide-react";
import { useVault, useNotes, useUI, useReview } from "../application/context";
import { useSidebarController } from "../application/hooks/useSidebarController";
import { MoveModal } from "./MoveModal";
import { Edit2, CornerRightUp } from "lucide-react";
import { Tooltip } from "./Tooltip";
import { ipc } from "../ipc";

// DnD Kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SortableItem = React.memo(function SortableItem({
  id,
  children,
  isChapter = false,
}: {
  id: string;
  children: React.ReactNode;
  isChapter?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        {...attributes}
        {...listeners}
        className={`absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500 z-10 ${isChapter ? "ml-6" : ""}`}
      >
        <GripVertical size={14} />
      </div>
      {children}
    </div>
  );
});

export function LeftSidebar() {
  const handleSync = useVault((s) => s.handleSync);
  const selectProject = useNotes((s) => s.selectProject);
  const setIsNewBookModalOpen = useUI((s) => s.setIsNewBookModalOpen);
  const setIsNewCourseModalOpen = useUI((s) => s.setIsNewCourseModalOpen);
  const showToast = useUI((s) => s.showToast);
  const zenMode = useUI((s) => s.zenMode);
  const activeTab = useUI((s) => s.activeTab);
  const setActiveTab = useUI((s) => s.setActiveTab);
  const setAddingChapterTo = useUI((s) => s.setAddingChapterTo);
  const addingChapterTo = useUI((s) => s.addingChapterTo);
  const newChapterName = useUI((s) => s.newChapterName);
  const setNewChapterName = useUI((s) => s.setNewChapterName);
  const addingProjectType = useUI((s) => s.addingProjectType);
  const setSettingsOpen = useUI((s) => s.setSettingsOpen);
  const setSettingsTab = useUI((s) => s.setSettingsTab);
  const setProjectViewMode = useUI((s) => s.setProjectViewMode);
  const handleToggleLive = useVault((s) => s.handleToggleLive);
  const handleOpenLive = useVault((s) => s.handleOpenLive);

  const handleOpenSettings = () => {
    setSettingsTab("general");
    setSettingsOpen(true);
  };
  const sidebarCollapsed = useUI((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUI((s) => s.setSidebarCollapsed);
  const setActiveProjectId = useNotes((s) => s.setActiveProjectId);
  const projects = useNotes((s) => s.projects);
  const activeProjectId = useNotes((s) => s.activeProjectId);
  const handleAddChapter = useNotes((s) => s.handleAddChapter);
  const activeProject = useNotes((s) => s.activeProject);
  const rootProject = useNotes((s) => s.rootProject);
  const handleArchiveProject = useNotes((s) => s.handleArchiveProject);
  const handleUnarchiveProject = useNotes((s) => s.handleUnarchiveProject);
  const vaultPath = useVault((s) => s.vaultPath);
  const syncing = useVault((s) => s.syncing);
  const isLive = useVault((s) => s.isLive);
  const setReviewMode = useReview((s) => s.setReviewMode);

  // Sidebar Controller
  const {
    sidebarSearch,
    setSidebarSearch,
    books,
    courses,
    renamingProjectId,
    setRenamingProjectId,
    renamingProjectName,
    setRenamingProjectName,
    movingItem,
    setMovingItem,
    contextMenu,
    setContextMenu,
    handleRenameProject,
    handleMoveItem,
    handleDragEnd,
  } = useSidebarController();

  const isFocusedMode = activeTab === "project" && rootProject;
  const booksToRender = isFocusedMode
    ? rootProject.type === "book"
      ? [rootProject]
      : []
    : projects.filter((p) => p.type === "book" && !p.is_archived);

  const coursesToRender = isFocusedMode
    ? rootProject.type === "course"
      ? [rootProject]
      : []
    : projects.filter((p) => p.type === "course" && !p.is_archived);

  const archivedToRender = isFocusedMode
    ? []
    : projects.filter((p) => p.is_archived);

  // Force expand the active project when navigating to it
  useEffect(() => {
    if (activeTab === "project" && rootProject) {
      setExpandedProjects((prev) => ({ ...prev, [rootProject.id]: true }));
    }
  }, [activeTab, rootProject]);

  const [booksCollapsed, setBooksCollapsed] = useState(true);
  const [coursesCollapsed, setCoursesCollapsed] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<
    Record<string, boolean>
  >({});
  const [isExporting, setIsExporting] = useState(false);

  const handleExportZip = async () => {
    if (!vaultPath) return;
    setIsExporting(true);
    try {
      const res = await ipc.invoke("db:exportVaultZip", vaultPath);
      if (res.success && res.data) {
        showToast("Export successful to: " + res.data.filePath);
      } else if (res.error !== "Export canceled") {
        showToast("Export failed: " + res.error, "error");
      }
    } catch (e: any) {
      showToast("Error: " + e.message, "error");
    } finally {
      setIsExporting(false);
    }
  };

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <>
      {!zenMode && (
        <aside
          className={`${sidebarCollapsed ? "w-[60px]" : "w-[280px]"} overflow-x-hidden bg-zinc-100/90 dark:bg-card backdrop-blur-xl border-r border-border flex flex-col pt-12 flex-shrink-0 transition-all duration-300 relative group/sidebar`}
        >
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute top-3 right-3 p-1 rounded-xl text-gray-400 hover:text-zinc-800 dark:hover:text-mac-text-dark hover:bg-accent hover:text-accent-foreground opacity-0 group-hover/sidebar:opacity-100 transition-opacity"
          >
            {sidebarCollapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
          </button>

          {!sidebarCollapsed && (
            <div className="px-4 mb-4 mt-2">
              <div className="flex items-center bg-white dark:bg-background rounded-xl px-3 py-1.5 border border-border shadow-sm focus-within:border-mac-accent focus-within:ring-2 focus-within:ring-mac-accent/20 transition-all">
                <Search size={14} className="text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-full text-foreground placeholder-gray-400"
                />
              </div>
            </div>
          )}

          <nav className="flex-1 overflow-y-auto px-2">
            <div className="mb-6">
              <ul className="space-y-0.5">
                <li>
                  <button
                    onClick={() => {
                      setActiveTab("agenda");
                      setReviewMode(false);
                    }}
                    className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-0" : "px-3"} ${sidebarCollapsed ? "justify-center px-0" : "px-3"} py-1.5 text-[13px] font-medium rounded-xl transition-colors ${activeTab === "agenda" ? "bg-accent text-accent-foreground shadow-sm" : "hover:bg-accent hover:text-accent-foreground text-foreground"}`}
                  >
                    <Circle
                      size={12}
                      className={`mr-2 ${activeTab === "agenda" ? "fill-white" : "fill-[#eab308] text-[#eab308]"}`}
                    />
                    {!sidebarCollapsed && (
                      <span className="truncate ml-2">On the Agenda</span>
                    )}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setActiveTab("today");
                      setReviewMode(false);
                    }}
                    className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-0" : "px-3"} ${sidebarCollapsed ? "justify-center px-0" : "px-3"} py-1.5 text-[13px] font-medium rounded-xl transition-colors ${activeTab === "today" ? "bg-accent text-accent-foreground shadow-sm" : "hover:bg-accent hover:text-accent-foreground text-foreground"}`}
                  >
                    <Calendar size={14} className="mr-2 opacity-80" />{" "}
                    {!sidebarCollapsed && " Today"}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setActiveTab("graph");
                      setReviewMode(false);
                    }}
                    className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-0" : "px-3"} ${sidebarCollapsed ? "justify-center px-0" : "px-3"} py-1.5 text-[13px] font-medium rounded-xl transition-colors ${activeTab === "graph" ? "bg-accent text-accent-foreground shadow-sm" : "hover:bg-accent hover:text-accent-foreground text-foreground"}`}
                  >
                    <Network size={14} className="mr-2" />
                    {!sidebarCollapsed && "Knowledge Graph"}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setActiveTab("analytics");
                      setActiveProjectId(null);
                      setReviewMode(false);
                    }}
                    className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-0" : "px-3"} py-1.5 text-[13px] font-medium rounded-xl transition-colors ${activeTab === "analytics" ? "bg-indigo-500 text-white" : "hover:bg-accent hover:text-accent-foreground text-foreground"}`}
                  >
                    <BarChart
                      size={14}
                      className={`${!sidebarCollapsed ? "mr-2" : ""}`}
                    />
                    {!sidebarCollapsed && "Analytics"}
                  </button>
                </li>
              </ul>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              {/* Books Section */}
              {(booksToRender.length > 0 ||
                addingProjectType === "book" ||
                sidebarSearch === "") && (
                <div className="mb-6">
                  {isFocusedMode && !sidebarCollapsed && (
                    <button
                      onClick={() => setActiveTab("agenda")}
                      className="w-full flex items-center px-3 py-2 text-[13px] font-medium rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors mb-2"
                    >
                      <ChevronLeft size={14} className="mr-1" /> Back to Catalog
                    </button>
                  )}
                  {!sidebarCollapsed && !isFocusedMode && (
                    <div className="flex items-center justify-between mb-1 px-3 group">
                      <div
                        onClick={() => setActiveTab("books")}
                        className={`cursor-pointer text-[11px] font-bold uppercase tracking-wider flex items-center hover:text-gray-800 dark:hover:text-gray-300 ${activeTab === "books" ? "text-blue-500" : "text-[#71717a] dark:text-gray-500"}`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBooksCollapsed(!booksCollapsed);
                          }}
                          className="mr-1 hover:text-gray-900 dark:hover:text-gray-200"
                        >
                          {booksCollapsed ? (
                            <ChevronRight size={12} />
                          ) : (
                            <ChevronDown size={12} />
                          )}
                        </button>
                        Books
                      </div>
                      <button
                        onClick={() => {
                          setBooksCollapsed(false);
                          setIsNewBookModalOpen(true);
                        }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <PlusCircle size={14} />
                      </button>
                    </div>
                  )}

                  {(!booksCollapsed || sidebarCollapsed || isFocusedMode) && (
                    <ul className="space-y-0.5">
                      <SortableContext
                        items={booksToRender.map((p: any) => p.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {booksToRender.map((p: any) => {
                          const isExpanded = expandedProjects[p.id] === true;
                          return (
                            <SortableItem key={p.id} id={p.id}>
                              <div className="flex items-center group">
                                <button
                                  onClick={() => {
                                    setActiveTab("project" as any);
                                    setProjectViewMode("toc");
                                    selectProject(p.id);
                                  }}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    setContextMenu({
                                      x: e.clientX,
                                      y: e.clientY,
                                      id: p.id,
                                      name: p.name,
                                      type: "book",
                                    });
                                  }}
                                  className={`flex-1 flex items-center ${sidebarCollapsed ? "justify-center px-0" : "pl-4 pr-6"} py-1.5 text-[13px] rounded-xl transition-colors ${activeProjectId === p.id && activeTab === "project" ? "bg-[#e4e4e7] dark:bg-white/5 text-[#1c1c1e] dark:text-white font-medium" : "hover:bg-accent hover:text-accent-foreground text-foreground"}`}
                                >
                                  {!sidebarCollapsed && (
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Accordion behavior: close others if expanding this one
                                        setExpandedProjects((prev) => ({
                                          ...prev,
                                          [p.id]: !isExpanded,
                                        }));
                                      }}
                                      className="w-5 h-5 flex flex-shrink-0 items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors mr-1"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown size={12} />
                                      ) : (
                                        <ChevronRight size={12} />
                                      )}
                                    </div>
                                  )}
                                  <div
                                    className={`w-2 h-2 rounded-full ${activeProjectId === p.id || p.chapters?.some((c: any) => c.id === activeProjectId) ? p.color : "bg-gray-300 dark:bg-zinc-700"} ${!sidebarCollapsed ? "mr-2" : ""} flex-shrink-0 transition-colors`}
                                  ></div>
                                  {!sidebarCollapsed &&
                                    (renamingProjectId === p.id ? (
                                      <input
                                        autoFocus
                                        value={renamingProjectName}
                                        onChange={(e) =>
                                          setRenamingProjectName(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter")
                                            handleRenameProject(
                                              p.id,
                                              renamingProjectName,
                                            );
                                          if (e.key === "Escape")
                                            setRenamingProjectId(null);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="bg-transparent border-b border-gray-400 outline-none w-full text-[13px] mr-2"
                                      />
                                    ) : (
                                      <span className="truncate">{p.name}</span>
                                    ))}
                                </button>
                                {!sidebarCollapsed && (
                                  <button
                                    onClick={() => setAddingChapterTo(p.id)}
                                    className="opacity-0 group-hover:opacity-100 px-2 text-gray-400 hover:text-blue-500"
                                    title="Add Chapter"
                                  >
                                    <PlusCircle size={12} />
                                  </button>
                                )}
                              </div>

                              {/* Render Chapters */}
                              {isExpanded &&
                                p.chapters &&
                                p.chapters.length > 0 && (
                                  <ul className="mt-0.5 space-y-0.5">
                                    <SortableContext
                                      items={p.chapters.map((c: any) => c.id)}
                                      strategy={verticalListSortingStrategy}
                                    >
                                      {p.chapters.map((c: any) => (
                                        <SortableItem
                                          key={c.id}
                                          id={c.id}
                                          isChapter={true}
                                        >
                                          <button
                                            onClick={() => {
                                              setActiveTab("project" as any);
                                              setProjectViewMode("toc");
                                              selectProject(p.id, c.id);
                                            }}
                                            className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-0" : "pl-10 pr-6"} py-1.5 text-[12px] rounded-xl transition-colors ${activeProjectId === c.id && activeTab === "project" ? "bg-[#e4e4e7] dark:bg-white/5 text-[#1c1c1e] dark:text-white font-medium" : "hover:bg-accent hover:text-accent-foreground text-[#71717a] dark:text-gray-400"}`}
                                          >
                                            {activeProjectId === c.id ? (
                                              <div
                                                className={`w-1.5 h-1.5 rounded-full ${p.color} ${!sidebarCollapsed ? "mr-2" : ""} flex-shrink-0 transition-colors`}
                                              />
                                            ) : (
                                              <CircleDashed
                                                size={10}
                                                className={`${!sidebarCollapsed ? "mr-2" : ""} opacity-50 flex-shrink-0`}
                                              />
                                            )}
                                            {!sidebarCollapsed && (
                                              <span className="truncate">
                                                {c.name}
                                              </span>
                                            )}
                                          </button>
                                        </SortableItem>
                                      ))}
                                    </SortableContext>
                                  </ul>
                                )}
                            </SortableItem>
                          );
                        })}
                      </SortableContext>
                    </ul>
                  )}
                </div>
              )}

              {/* Archives Section */}
              {archivedToRender.length > 0 &&
                sidebarSearch === "" &&
                !isFocusedMode && (
                  <div className="mb-6">
                    {!sidebarCollapsed && (
                      <div className="flex items-center justify-between mb-1 px-3 group">
                        <div className="cursor-default text-[11px] font-bold uppercase tracking-wider flex items-center text-[#71717a] dark:text-gray-500">
                          <Archive size={12} className="mr-1" /> Archived
                        </div>
                      </div>
                    )}
                    <ul className="space-y-0.5">
                      {archivedToRender.map((p: any) => (
                        <li key={p.id}>
                          <div className="flex items-center group pl-8 pr-6 py-1.5 text-[13px] rounded-xl text-gray-500">
                            <span className="truncate line-through opacity-70">
                              {p.name}
                            </span>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setContextMenu({
                                  x: e.clientX,
                                  y: e.clientY,
                                  id: p.id,
                                  name: p.name,
                                  type: p.type as any,
                                });
                              }}
                              className="ml-auto opacity-0 group-hover:opacity-100"
                            >
                              <Settings size={12} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Courses Section */}
              {(coursesToRender.length > 0 ||
                addingProjectType === "course" ||
                sidebarSearch === "") && (
                <div className="mb-6">
                  {!sidebarCollapsed && !isFocusedMode && (
                    <div className="flex items-center justify-between mb-1 px-3 group">
                      <div
                        onClick={() => setActiveTab("courses")}
                        className={`cursor-pointer text-[11px] font-bold uppercase tracking-wider flex items-center hover:text-gray-800 dark:hover:text-gray-300 ${activeTab === "courses" ? "text-purple-500" : "text-[#71717a] dark:text-gray-500"}`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCoursesCollapsed(!coursesCollapsed);
                          }}
                          className="mr-1 hover:text-gray-900 dark:hover:text-gray-200"
                        >
                          {coursesCollapsed ? (
                            <ChevronRight size={12} />
                          ) : (
                            <ChevronDown size={12} />
                          )}
                        </button>
                        COURSES
                      </div>
                      <button
                        onClick={() => {
                          setCoursesCollapsed(false);
                          setIsNewCourseModalOpen(true);
                        }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <PlusCircle size={14} />
                      </button>
                    </div>
                  )}

                  {!coursesCollapsed && (
                    <ul className="space-y-0.5">
                      <SortableContext
                        items={coursesToRender.map((p: any) => p.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {coursesToRender.map((p: any) => {
                          const isExpanded = expandedProjects[p.id] === true;
                          return (
                            <SortableItem key={p.id} id={p.id}>
                              <div className="flex items-center group">
                                {!sidebarCollapsed && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedProjects((prev) => ({
                                        ...prev,
                                        [p.id]: !isExpanded,
                                      }));
                                    }}
                                    className="pl-3 pr-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown size={12} />
                                    ) : (
                                      <ChevronRight size={12} />
                                    )}
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setActiveTab("project" as any);
                                    setProjectViewMode("toc");
                                    selectProject(p.id);
                                  }}
                                  className={`flex-1 flex items-center ${!sidebarCollapsed ? "px-2" : "px-6"} py-1.5 text-[13px] rounded-xl transition-colors ${activeProjectId === p.id && activeTab === "project" ? "bg-[#e4e4e7] dark:bg-white/5 text-[#1c1c1e] dark:text-white font-medium" : "hover:bg-accent hover:text-accent-foreground text-foreground"}`}
                                >
                                  <div
                                    className={`w-2 h-2 rounded-full ${p.color} mr-2 flex-shrink-0`}
                                  ></div>
                                  {!sidebarCollapsed && (
                                    <span className="truncate">{p.name}</span>
                                  )}
                                </button>
                                <button
                                  onClick={() => setAddingChapterTo(p.id)}
                                  className="opacity-0 group-hover:opacity-100 px-2 text-gray-400 hover:text-blue-500"
                                  title="Add Chapter"
                                >
                                  <PlusCircle size={12} />
                                </button>
                              </div>

                              {/* Render Chapters */}
                              {isExpanded &&
                                p.chapters &&
                                p.chapters.length > 0 && (
                                  <ul className="mt-0.5 space-y-0.5">
                                    <SortableContext
                                      items={p.chapters.map((c: any) => c.id)}
                                      strategy={verticalListSortingStrategy}
                                    >
                                      {p.chapters.map((c: any) => (
                                        <SortableItem
                                          key={c.id}
                                          id={c.id}
                                          isChapter={true}
                                        >
                                          <button
                                            onClick={() => {
                                              setActiveTab("project" as any);
                                              setProjectViewMode("toc");
                                              selectProject(p.id, c.id);
                                            }}
                                            className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-0" : "px-3"} pl-10 pr-6 py-1.5 text-[12px] rounded-xl transition-colors ${activeProjectId === c.id && activeTab === "project" ? "bg-[#e4e4e7] dark:bg-white/5 text-[#1c1c1e] dark:text-white font-medium" : "hover:bg-accent hover:text-accent-foreground text-[#71717a] dark:text-gray-400"}`}
                                          >
                                            <CircleDashed
                                              size={10}
                                              className="mr-2 opacity-50 flex-shrink-0"
                                            />
                                            {!sidebarCollapsed && (
                                              <span className="truncate">
                                                {c.name}
                                              </span>
                                            )}
                                          </button>
                                        </SortableItem>
                                      ))}
                                    </SortableContext>
                                  </ul>
                                )}
                            </SortableItem>
                          );
                        })}
                      </SortableContext>
                    </ul>
                  )}
                </div>
              )}
            </DndContext>
          </nav>

          <div className="p-3 border-t border-[#d4d4d8] dark:border-[#333336] mt-auto space-y-0.5">
            <Tooltip content="Sync Vault" side="right">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-[#71717a] dark:text-gray-400 hover:text-[#1c1c1e] dark:hover:text-white rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  className={syncing ? "animate-spin" : ""}
                />
                {!sidebarCollapsed && (
                  <span>{syncing ? "Syncing..." : "Sync Vault"}</span>
                )}
              </button>
            </Tooltip>
            <Tooltip content="Export as ZIP" side="right">
              <button
                onClick={handleExportZip}
                disabled={isExporting}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-[#71717a] dark:text-gray-400 hover:text-[#1c1c1e] dark:hover:text-white rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
              >
                <Archive
                  size={14}
                  className={isExporting ? "animate-bounce" : ""}
                />
                {!sidebarCollapsed && (
                  <span>{isExporting ? "Exporting..." : "Export as ZIP"}</span>
                )}
              </button>
            </Tooltip>

            <Tooltip content="Settings" side="right">
              <button
                onClick={handleOpenSettings}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-[#71717a] dark:text-gray-400 hover:text-[#1c1c1e] dark:hover:text-white rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Settings size={14} />
                {!sidebarCollapsed && <span>Settings</span>}
              </button>
            </Tooltip>

            {isLive ? (
              <>
                <Tooltip content="Stop Live Preview" side="right">
                  <button
                    onClick={handleToggleLive}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-red-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Square size={14} fill="currentColor" />
                    {!sidebarCollapsed && <span>Stop Live Preview</span>}
                  </button>
                </Tooltip>
                <Tooltip content="Open in Browser" side="right">
                  <button
                    onClick={handleOpenLive}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-[#007aff] hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <ExternalLink size={14} />
                    {!sidebarCollapsed && <span>Open in Browser</span>}
                  </button>
                </Tooltip>
              </>
            ) : (
              <Tooltip content="Go Live" side="right">
                <button
                  onClick={handleToggleLive}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-[#71717a] dark:text-gray-400 hover:text-[#007aff] dark:hover:text-[#0a84ff] rounded-lg hover:bg-[#007aff]/10 dark:hover:bg-[#0a84ff]/20 transition-colors"
                >
                  <Play size={14} fill="currentColor" />
                  {!sidebarCollapsed && <span>Go Live</span>}
                </button>
              </Tooltip>
            )}
          </div>

          {movingItem && (
            <MoveModal
              itemType={movingItem.type}
              itemName={movingItem.name}
              itemId={movingItem.id}
              projects={projects}
              onMove={handleMoveItem}
              onClose={() => setMovingItem(null)}
            />
          )}

          {contextMenu && (
            <div
              className="fixed z-50 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-xl rounded-lg py-1 w-48 text-sm"
              style={{
                top: Math.min(contextMenu.y, window.innerHeight - 100),
                left: Math.min(contextMenu.x, window.innerWidth - 200),
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRenamingProjectId(contextMenu.id);
                  setRenamingProjectName(contextMenu.name);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 flex items-center"
              >
                <Edit2 size={14} className="mr-2" /> Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMovingItem({
                    type: contextMenu.type,
                    id: contextMenu.id,
                    name: contextMenu.name,
                  });
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 flex items-center"
              >
                <CornerRightUp size={14} className="mr-2" /> Move
              </button>
              {(contextMenu.type === "book" ||
                contextMenu.type === "course") && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const project = projects.find(
                      (p) => p.id === contextMenu.id,
                    );
                    if (project?.is_archived) {
                      handleUnarchiveProject(contextMenu.id);
                    } else {
                      handleArchiveProject(contextMenu.id);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 flex items-center"
                >
                  <Archive size={14} className="mr-2" />
                  {projects.find((p) => p.id === contextMenu.id)?.is_archived
                    ? "Unarchive"
                    : "Archive"}
                </button>
              )}
            </div>
          )}
        </aside>
      )}
    </>
  );
}
