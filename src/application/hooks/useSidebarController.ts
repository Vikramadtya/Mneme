import { ipcClient } from "@/api/ipcClient";
import type { Project } from "../../domain/models";
import { useState, useMemo, useEffect } from "react";
import { useVault, useNotes } from "../../application/context";
import { arrayMove } from "@dnd-kit/sortable";

export function useSidebarController() {
  const { handleSync, vaultPath } = useVault();
  const { projects, allNotesFlat, setProjects } = useNotes();

  const [sidebarSearch, setSidebarSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // DND & Context states
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(
    null,
  );
  const [renamingProjectName, setRenamingProjectName] = useState("");
  const [movingItem, setMovingItem] = useState<{
    type: "note" | "chapter" | "book" | "course";
    id: string;
    name: string;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    id: string;
    name: string;
    type: "book" | "course" | "chapter";
  } | null>(null);

  // Search logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(sidebarSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [sidebarSearch]);

  const filteredProjects = useMemo(
    () =>
      projects.filter((p: Project) => {
        const term = debouncedSearch.toLowerCase();
        const projectMatches = p.name.toLowerCase().includes(term);
        const hasMatchingChapters = p.chapters?.some((c: Project) =>
          c.name.toLowerCase().includes(term),
        );
        return projectMatches || hasMatchingChapters;
      }),
    [projects, debouncedSearch],
  );

  const books = filteredProjects.filter((p: Project) => p.type === "book");
  const courses = filteredProjects.filter((p: Project) => p.type === "course");

  // Event handlers
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const handleRenameProject = async (id: string, newName: string) => {
    if (!newName.trim()) {
      setRenamingProjectId(null);
      return;
    }
    const target =
      projects.find((p: Project) => p.id === id) ||
      projects
        .flatMap((p: Project) => p.chapters || [])
        .find((c: Project) => c.id === id);
    if (!target) return;

    target.name = newName;
    if (vaultPath) await ipcClient.db.saveProject(vaultPath, target);
    setRenamingProjectId(null);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setProjects((items: any[]) => {
      let isChapter = false;
      let parentProj: any = null;

      for (const p of items) {
        if (p.chapters?.find((c: Project) => c.id === active.id)) {
          isChapter = true;
          parentProj = p;
          break;
        }
      }

      if (isChapter) {
        const newItems = items.map((p: Project) => {
          if (p.id === parentProj.id) {
            const oldIndex = p.chapters.findIndex(
              (c: Project) => c.id === active.id,
            );
            const newIndex = p.chapters.findIndex(
              (c: Project) => c.id === over.id,
            );
            const newChapters = arrayMove(p.chapters, oldIndex, newIndex);

            if (vaultPath) {
              newChapters.forEach((ch: any, idx: number) => {
                ch.sort_order = idx;
                ipcClient.db.saveProject(vaultPath, ch);
              });
            }
            return { ...p, chapters: newChapters };
          }
          return p;
        });
        return newItems;
      } else {
        const oldIndex = items.findIndex((p: Project) => p.id === active.id);
        const newIndex = items.findIndex((p: Project) => p.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);

        if (vaultPath) {
          newItems.forEach((proj: any, idx: number) => {
            proj.sort_order = idx;
            ipcClient.db.saveProject(vaultPath, proj);
          });
        }
        return newItems;
      }
    });
  };

  const handleMoveItem = async (newParentId: string | null) => {
    if (!movingItem || !vaultPath) return;

    if (movingItem.type === "note") {
      const note = allNotesFlat.find((n: any) => n.id === movingItem.id);
      if (note && note.project_id !== newParentId) {
        await ipcClient.db.saveNote(vaultPath, {
          ...note,
          chapterId: newParentId,
          project_id: newParentId,
        });
      }
    } else {
      const p =
        projects.find((pr: any) => pr.id === movingItem.id) ||
        projects
          .flatMap((pr: any) => pr.chapters || [])
          .find((c: Project) => c.id === movingItem.id);
      if (p && newParentId && p.id !== newParentId) {
        await ipcClient.db.saveProject(vaultPath, {
          ...p,
          parent_id: newParentId,
        });
      }
    }
    setMovingItem(null);
    handleSync();
  };

  return {
    sidebarSearch,
    setSidebarSearch,
    debouncedSearch,
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
  };
}
