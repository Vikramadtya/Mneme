import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  PlusCircle,
  CircleDashed,
  GripVertical,
  Archive,
  Settings,
  FileText,
} from "lucide-react";
import { useUI, useNotes } from "../../application/context";
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
  indent = 0,
}: {
  id: string;
  children: React.ReactNode;
  indent?: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const indentClass = indent === 1 ? "ml-6" : indent === 2 ? "ml-[48px]" : "";

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        {...attributes}
        {...listeners}
        className={`absolute left-1 top-[6px] opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500 z-10 ${indentClass}`}
      >
        <GripVertical size={14} />
      </div>
      {children}
    </div>
  );
});

export function ProjectList({ controller }: { controller: any }) {
  const {
    sidebarSearch,
    handleDragEnd,
    renamingProjectId,
    setRenamingProjectId,
    renamingProjectName,
    setRenamingProjectName,
    setContextMenu,
  } = controller;

  const sidebarCollapsed = useUI((s) => s.sidebarCollapsed);
  const activeTab = useUI((s) => s.activeTab);
  const setActiveTab = useUI((s) => s.setActiveTab);
  const expandedProjects = useUI((s) => s.expandedProjects);
  const setExpandedProjects = useUI((s) => s.setExpandedProjects);
  const addingChapterTo = useUI((s) => s.addingChapterTo);
  const setAddingChapterTo = useUI((s) => s.setAddingChapterTo);
  const newChapterName = useUI((s) => s.newChapterName);
  const setNewChapterName = useUI((s) => s.setNewChapterName);
  const addingProjectType = useUI((s) => s.addingProjectType);
  const setIsNewProjectModalOpen = useUI(
    (s: any) => s.setIsNewProjectModalOpen,
  );
  const setProjectViewMode = useUI((s) => s.setProjectViewMode);

  const projects = useNotes((s) => s.projects);
  const activeProjectId = useNotes((s) => s.activeProjectId);
  const allNotesMap = useNotes((s) => s.allNotesMap);
  const addTab = useUI((s: any) => s.addTab);
  const activeTabId = useUI((s: any) => s.activeTabId);
  const setActiveTabId = useUI((s: any) => s.setActiveTabId);
  const handleAddChapter = useNotes((s) => s.handleAddChapter);
  const rootProject = useNotes((s) => s.rootProject);
  const selectProject = useNotes((s) => s.selectProject);

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

  const [booksCollapsed, setBooksCollapsed] = useState(true);
  const [coursesCollapsed, setCoursesCollapsed] = useState(true);

  const renderSection = (
    type: "book" | "course",
    title: string,
    Icon: any,
    colorClass: string,
    projectsList: any[],
    isCollapsed: boolean,
    setIsCollapsed: (v: boolean) => void,
    onAddClick: () => void,
  ) => {
    const isBook = type === "book";
    const childTerm = isBook ? "Chapter" : "Module";
    const showBackToCatalog = isBook;

    return (
      <div className="mb-6">
        {showBackToCatalog && isFocusedMode && !sidebarCollapsed && (
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
              onClick={() =>
                setActiveTab(type === "book" ? "books" : "courses")
              }
              className={
                "cursor-pointer text-[11px] font-bold uppercase tracking-wider flex items-center hover:text-gray-800 dark:hover:text-gray-300 " +
                (activeTab === (type === "book" ? "books" : "courses")
                  ? colorClass
                  : "text-[#71717a] dark:text-gray-500")
              }
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCollapsed(!isCollapsed);
                }}
                className="mr-1 hover:text-gray-900 dark:hover:text-gray-200"
              >
                {isCollapsed ? (
                  <ChevronRight size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}
              </button>
              {title}
            </div>
            <button
              onClick={() => {
                setIsCollapsed(false);
                onAddClick();
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <PlusCircle size={14} />
            </button>
          </div>
        )}

        {(!isCollapsed || sidebarCollapsed || isFocusedMode) && (
          <ul className="space-y-0.5">
            <SortableContext
              items={projectsList.map((p: any) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {projectsList.map((p: any) => {
                const isExpanded = expandedProjects[p.id] === true;
                return (
                  <SortableItem key={p.id} id={p.id} indent={0}>
                    <div className="flex items-center group">
                      <button
                        onClick={() => {
                          setActiveTab("project" as any);
                          setProjectViewMode("toc");
                          selectProject(p.id);
                          setActiveTabId(null);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            id: p.id,
                            name: p.name,
                            type: type,
                          });
                        }}
                        className={
                          "flex-1 flex items-center " +
                          (sidebarCollapsed
                            ? "justify-center px-0"
                            : "pl-4 pr-6") +
                          " py-1.5 text-[13px] rounded-xl transition-colors " +
                          (activeProjectId === p.id && activeTab === "project"
                            ? "bg-[#e4e4e7] dark:bg-white/5 text-[#1c1c1e] dark:text-white font-medium"
                            : "hover:bg-accent hover:text-accent-foreground text-foreground")
                        }
                      >
                        {!sidebarCollapsed && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedProjects((prev: any) => ({
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
                          className={
                            "w-2 h-2 rounded-full " +
                            (activeProjectId === p.id ||
                            p.chapters?.some(
                              (c: any) => c.id === activeProjectId,
                            )
                              ? p.color || "bg-purple-500"
                              : "bg-gray-300 dark:bg-zinc-700") +
                            (!sidebarCollapsed ? " mr-2" : "") +
                            " flex-shrink-0 transition-colors"
                          }
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
                                  controller.handleRenameProject(
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
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!expandedProjects[p.id]) {
                              setExpandedProjects((prev: any) => ({
                                ...prev,
                                [p.id]: true,
                              }));
                            }
                            setAddingChapterTo(p.id);
                          }}
                          className={`px-2 text-gray-400 hover:text-blue-500 transition-opacity ${
                            isFocusedMode || activeProjectId === p.id
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          }`}
                          title={"Add " + childTerm}
                        >
                          <PlusCircle size={12} />
                        </button>
                      )}
                    </div>

                    {/* Render Chapters/Modules */}
                    {isExpanded &&
                      (p.chapters?.length > 0 || addingChapterTo === p.id) && (
                        <ul className="mt-0.5 space-y-0.5">
                          <SortableContext
                            items={(p.chapters || []).map((c: any) => c.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {(p.chapters || []).map((c: any) => (
                              <SortableItem key={c.id} id={c.id} indent={1}>
                                <div className="flex items-center group/chapter">
                                  <button
                                    onClick={() => {
                                      setActiveTab("project" as any);
                                      setProjectViewMode("toc");
                                      selectProject(p.id, c.id);
                                      setActiveTabId(null);
                                      // Also expand
                                      setExpandedProjects((prev: any) => ({
                                        ...prev,
                                        [c.id]: true,
                                      }));
                                    }}
                                    className={
                                      "w-full flex items-center " +
                                      (sidebarCollapsed
                                        ? "justify-center px-0"
                                        : "pl-10 pr-6") +
                                      " py-1.5 text-[12px] rounded-xl transition-colors " +
                                      (activeProjectId === c.id &&
                                      activeTab === "project"
                                        ? "bg-[#e4e4e7] dark:bg-white/5 text-[#1c1c1e] dark:text-white font-medium"
                                        : "hover:bg-accent hover:text-accent-foreground text-[#71717a] dark:text-gray-400")
                                    }
                                  >
                                    {!sidebarCollapsed && (
                                      <div
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedProjects((prev: any) => ({
                                            ...prev,
                                            [c.id]: !prev[c.id],
                                          }));
                                        }}
                                        className="w-4 h-4 flex flex-shrink-0 items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors mr-1"
                                      >
                                        {expandedProjects[c.id] ? (
                                          <ChevronDown size={10} />
                                        ) : (
                                          <ChevronRight size={10} />
                                        )}
                                      </div>
                                    )}
                                    {activeProjectId === c.id ? (
                                      <div
                                        className={
                                          "w-1.5 h-1.5 rounded-full " +
                                          (p.color || "bg-purple-500") +
                                          (!sidebarCollapsed ? " mr-2" : "") +
                                          " flex-shrink-0 transition-colors"
                                        }
                                      />
                                    ) : (
                                      <CircleDashed
                                        size={10}
                                        className={
                                          (!sidebarCollapsed ? "mr-2 " : "") +
                                          "opacity-50 flex-shrink-0"
                                        }
                                      />
                                    )}
                                    {!sidebarCollapsed && (
                                      <span className="truncate">{c.name}</span>
                                    )}
                                  </button>
                                </div>
                                {expandedProjects[c.id] &&
                                  allNotesMap[c.id]?.length > 0 && (
                                    <ul className="mt-0.5 space-y-0.5 pb-1">
                                      <SortableContext
                                        items={(allNotesMap[c.id] || []).map(
                                          (n: any) => n.id,
                                        )}
                                        strategy={verticalListSortingStrategy}
                                      >
                                        {[...(allNotesMap[c.id] || [])]
                                          .sort(
                                            (a, b) =>
                                              (a.sort_order || 0) -
                                              (b.sort_order || 0),
                                          )
                                          .map((n: any) => (
                                            <SortableItem
                                              key={n.id}
                                              id={n.id}
                                              indent={2}
                                            >
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  addTab({
                                                    id: n.id,
                                                    title: n.title,
                                                    type: "note",
                                                  });
                                                  setActiveTabId(n.id);
                                                }}
                                                className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-0" : "pl-[64px] pr-6"} py-1 text-[11px] rounded-xl transition-colors ${
                                                  activeTabId === n.id
                                                    ? "bg-[#e4e4e7] dark:bg-white/10 text-blue-500 font-medium"
                                                    : "hover:bg-accent text-[#71717a] dark:text-gray-400"
                                                }`}
                                              >
                                                {!sidebarCollapsed && (
                                                  <FileText
                                                    size={10}
                                                    className="mr-2 opacity-50 flex-shrink-0"
                                                  />
                                                )}
                                                {!sidebarCollapsed && (
                                                  <span className="truncate">
                                                    {n.title || "Untitled"}
                                                  </span>
                                                )}
                                              </button>
                                            </SortableItem>
                                          ))}
                                      </SortableContext>
                                    </ul>
                                  )}
                              </SortableItem>
                            ))}
                            {addingChapterTo === p.id && (
                              <li className="pl-10 pr-6 py-1.5 flex items-center">
                                <input
                                  autoFocus
                                  value={newChapterName}
                                  onChange={(e) =>
                                    setNewChapterName(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleAddChapter(p.id, newChapterName);
                                      setAddingChapterTo(null);
                                      setNewChapterName("");
                                    }
                                    if (e.key === "Escape")
                                      setAddingChapterTo(null);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  placeholder={"New " + childTerm + "..."}
                                  className="bg-transparent border-b border-gray-400 outline-none w-full text-[12px] text-gray-800 dark:text-gray-200"
                                />
                              </li>
                            )}
                          </SortableContext>
                        </ul>
                      )}

                    {/* Render Notes directly under Project */}
                    {isExpanded && allNotesMap[p.id]?.length > 0 && (
                      <ul className="mt-0.5 space-y-0.5 pb-1">
                        <SortableContext
                          items={(allNotesMap[p.id] || []).map(
                            (n: any) => n.id,
                          )}
                          strategy={verticalListSortingStrategy}
                        >
                          {[...(allNotesMap[p.id] || [])]
                            .sort(
                              (a, b) =>
                                (a.sort_order || 0) - (b.sort_order || 0),
                            )
                            .map((n: any) => (
                              <SortableItem key={n.id} id={n.id} indent={1}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addTab({
                                      id: n.id,
                                      title: n.title,
                                      type: "note",
                                    });
                                    setActiveTabId(n.id);
                                  }}
                                  className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-0" : "pl-[48px] pr-6"} py-1 text-[11px] rounded-xl transition-colors ${
                                    activeTabId === n.id
                                      ? "bg-[#e4e4e7] dark:bg-white/10 text-blue-500 font-medium"
                                      : "hover:bg-accent text-[#71717a] dark:text-gray-400"
                                  }`}
                                >
                                  {!sidebarCollapsed && (
                                    <FileText
                                      size={10}
                                      className="mr-2 opacity-50 flex-shrink-0"
                                    />
                                  )}
                                  {!sidebarCollapsed && (
                                    <span className="truncate">
                                      {n.title || "Untitled"}
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
    );
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      {/* Books Section */}
      {(booksToRender.length > 0 ||
        addingProjectType === "book" ||
        sidebarSearch === "") &&
        renderSection(
          "book",
          "Books",
          null,
          "text-blue-500",
          booksToRender,
          booksCollapsed,
          setBooksCollapsed,
          () => setIsNewProjectModalOpen(true, "book"),
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
        sidebarSearch === "") &&
        renderSection(
          "course",
          "COURSES",
          null,
          "text-purple-500",
          coursesToRender,
          coursesCollapsed,
          setCoursesCollapsed,
          () => setIsNewProjectModalOpen(true, "course"),
        )}
    </DndContext>
  );
}
