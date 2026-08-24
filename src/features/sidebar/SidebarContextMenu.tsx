import React from "react";
import {
  Edit2,
  PlusCircle,
  Settings,
  Archive,
  Trash2,
  CornerRightUp,
} from "lucide-react";
import { useUI, useVault, useNotes } from "../../application/context";

export function SidebarContextMenu({
  contextMenu,
  setContextMenu,
  setRenamingProjectId,
  setRenamingProjectName,
  setMovingItem,
  setDeleteConfirmOpen,
  setDeletingItem,
}: any) {
  const expandedProjects = useUI((s) => s.expandedProjects);
  const setExpandedProjects = useUI((s) => s.setExpandedProjects);
  const setAddingChapterTo = useUI((s) => s.setAddingChapterTo);
  const setEditingProject = useVault((s: any) => s.setEditingProject);
  const setAddingProjectType = useUI((s) => s.setAddingProjectType);
  const setIsNewProjectModalOpen = useUI(
    (s: any) => s.setIsNewProjectModalOpen,
  );
  const projects = useNotes((s) => s.projects);
  const handleUnarchiveProject = useNotes((s: any) => s.handleUnarchiveProject);
  const handleArchiveProject = useNotes((s) => s.handleArchiveProject);

  if (!contextMenu) return null;

  return (
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
      {(contextMenu.type === "book" || contextMenu.type === "course") && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!expandedProjects[contextMenu.id]) {
              setExpandedProjects((prev) => ({
                ...prev,
                [contextMenu.id]: true,
              }));
            }
            setAddingChapterTo(contextMenu.id);
            setContextMenu(null);
          }}
          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 flex items-center"
        >
          <PlusCircle size={14} className="mr-2" />
          Add {contextMenu.type === "book" ? "Chapter" : "Module"}
        </button>
      )}
      {(contextMenu.type === "book" || contextMenu.type === "course") && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            const project = projects.find((p) => p.id === contextMenu.id);
            setEditingProject(project);
            setAddingProjectType(project?.type || "book");
            setIsNewProjectModalOpen(true);
            setContextMenu(null);
          }}
          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 flex items-center"
        >
          <Settings size={14} className="mr-2" /> Edit Details
        </button>
      )}
      {(contextMenu.type === "book" || contextMenu.type === "course") && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            const project = projects.find((p) => p.id === contextMenu.id);
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
      <button
        onClick={(e) => {
          e.stopPropagation();
          setDeletingItem({
            type: contextMenu.type,
            id: contextMenu.id,
            name: contextMenu.name,
          });
          setDeleteConfirmOpen(true);
          setContextMenu(null);
        }}
        className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center"
      >
        <Trash2 size={14} className="mr-2" /> Delete
      </button>
    </div>
  );
}
