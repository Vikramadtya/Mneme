import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useUI, useNotes } from "../application/context";
import { useSidebarController } from "../application/hooks/useSidebarController";
import { MoveModal } from "./MoveModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";

import {
  SidebarSearch,
  SidebarNavLinks,
} from "../features/sidebar/SidebarHeader";
import { ProjectList } from "../features/sidebar/ProjectList";
import { SidebarFooter } from "../features/sidebar/SidebarFooter";
import { SidebarContextMenu } from "../features/sidebar/SidebarContextMenu";

export function LeftSidebar() {
  const zenMode = useUI((s) => s.zenMode);
  const sidebarCollapsed = useUI((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUI((s) => s.setSidebarCollapsed);
  const sidebarWidth = useUI((s) => s.sidebarWidth);
  const setSidebarWidth = useUI((s) => s.setSidebarWidth);

  const activeTab = useUI((s) => s.activeTab);
  const rootProject = useNotes((s) => s.rootProject);
  const setExpandedProjects = useUI((s) => s.setExpandedProjects);
  const projects = useNotes((s) => s.projects);
  const deleteProject = useNotes((s: any) => s.deleteProject);
  const deleteChapter = useNotes((s: any) => s.deleteChapter);

  const [isResizing, setIsResizing] = useState(false);

  // Force expand the active project when navigating to it
  useEffect(() => {
    if (activeTab === "project" && rootProject) {
      setExpandedProjects((prev: any) => ({ ...prev, [rootProject.id]: true }));
    }
  }, [activeTab, rootProject, setExpandedProjects]);

  const startResizing = React.useCallback(
    (mouseDownEvent: React.MouseEvent) => {
      mouseDownEvent.preventDefault();
      setIsResizing(true);
    },
    [],
  );

  useEffect(() => {
    const handleMouseMove = (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = Math.max(200, Math.min(600, mouseMoveEvent.clientX));
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, setSidebarWidth]);

  const controller = useSidebarController();
  const {
    sidebarSearch,
    setSidebarSearch,
    movingItem,
    setMovingItem,
    contextMenu,
    setContextMenu,
    setRenamingProjectId,
    setRenamingProjectName,
    handleMoveItem,
  } = controller;

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{
    id: string;
    type: string;
    name: string;
  } | null>(null);

  return (
    <>
      {!zenMode && (
        <aside
          className={`${sidebarCollapsed ? "w-[60px]" : ""} overflow-x-hidden bg-[#f5f5f7]/80 dark:bg-[#121212]/80 backdrop-blur-xl border-r border-border flex flex-col pt-12 flex-shrink-0 ${isResizing ? "select-none" : "transition-all duration-300"} relative group/sidebar`}
          style={{ width: sidebarCollapsed ? undefined : sidebarWidth }}
        >
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute top-3 right-3 p-1 rounded-xl text-gray-400 hover:text-zinc-800 dark:hover:text-mac-text-dark hover:bg-accent hover:text-accent-foreground opacity-0 group-hover/sidebar:opacity-100 transition-opacity"
          >
            {sidebarCollapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronLeft size={14} />
            )}
          </button>

          <SidebarSearch
            sidebarSearch={sidebarSearch}
            setSidebarSearch={setSidebarSearch}
          />

          <nav className="flex-1 overflow-y-auto px-2">
            <SidebarNavLinks />
            <ProjectList controller={controller} />
          </nav>

          <SidebarFooter />

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

          <SidebarContextMenu
            contextMenu={contextMenu}
            setContextMenu={setContextMenu}
            setRenamingProjectId={setRenamingProjectId}
            setRenamingProjectName={setRenamingProjectName}
            setMovingItem={setMovingItem}
            setDeleteConfirmOpen={setDeleteConfirmOpen}
            setDeletingItem={setDeletingItem}
          />

          {!sidebarCollapsed && (
            <div
              onMouseDown={startResizing}
              className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500 z-50"
            />
          )}
        </aside>
      )}

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeletingItem(null);
        }}
        onConfirm={() => {
          if (!deletingItem) return;
          if (deletingItem.type === "chapter") {
            deleteChapter(deletingItem.id);
          } else {
            deleteProject(deletingItem.id);
          }
        }}
        title={`Delete ${deletingItem?.type === "chapter" ? "Chapter" : "Project"}`}
        description={
          <>
            Are you sure you want to delete{" "}
            <strong>{deletingItem?.name}</strong>?
            {deletingItem?.type !== "chapter" &&
              " This will also delete all its associated chapters and notes."}{" "}
            This action cannot be undone.
          </>
        }
        confirmText="Delete"
      />
    </>
  );
}
