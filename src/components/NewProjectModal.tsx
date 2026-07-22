import React, { useState, useEffect } from "react";
import {
  X,
  Upload,
  Book,
  Link as LinkIcon,
  User,
  Save,
  GraduationCap,
} from "lucide-react";
import { useVault, useNotes, useUI } from "../application/context";
import { nanoid } from "nanoid";
import { ipc } from "../ipc";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";

export function NewProjectModal() {
  const vaultPath = useVault((s) => s.vaultPath);
  const projects = useNotes((s) => s.projects);
  const setProjects = useNotes((s) => s.setProjects);

  const isNewProjectModalOpen = useUI((s: any) => s.isNewProjectModalOpen);
  const setIsNewProjectModalOpen = useUI(
    (s: any) => s.setIsNewProjectModalOpen,
  );
  const addingProjectType = useUI((s: any) => s.addingProjectType);
  const editingProject = useVault((s: any) => s.editingProject);
  const setEditingProject = useVault((s: any) => s.setEditingProject);

  const [name, setName] = useState("");
  const [author, setAuthor] = useState("");
  const [url, setUrl] = useState("");
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (isNewProjectModalOpen) {
      if (editingProject) {
        setName(editingProject.name || "");
        setAuthor(editingProject.author || "");
        setUrl(editingProject.url || "");
        setPdfPath(editingProject.pdf_path || null);
        setPdfFileName(
          editingProject.pdf_path
            ? editingProject.pdf_path.split("/").pop()
            : null,
        );
      } else {
        setName("");
        setAuthor("");
        setUrl("");
        setPdfPath(null);
        setPdfFileName(null);
      }
    }
  }, [isNewProjectModalOpen, editingProject]);

  const isBook = addingProjectType === "book";
  const TypeIcon = isBook ? Book : GraduationCap;
  const typeText = isBook ? "Book" : "Course";
  const typeTextLower = isBook ? "book" : "course";
  const colorClass = isBook ? "text-blue-500" : "text-purple-500";
  const bgClass = isBook ? "bg-blue-500" : "bg-purple-500";
  const hoverBgClass = isBook ? "hover:bg-blue-600" : "hover:bg-purple-600";
  const shadowClass = isBook ? "shadow-blue-500/20" : "shadow-purple-500/20";
  const focusRingClass = isBook
    ? "focus:ring-blue-500/20 focus:border-blue-500"
    : "focus:ring-purple-500/20 focus:border-purple-500";
  const disabledBgClass = isBook
    ? "bg-blue-300 dark:bg-blue-900/50"
    : "bg-purple-300 dark:bg-purple-900/50";
  const hoverIconClass = isBook
    ? "group-hover:text-blue-500"
    : "group-hover:text-purple-500";

  const handleSelectPdf = async () => {
    try {
      const res = await ipc.invoke("app:selectPdf");
      if (res.success && res.data) {
        setPdfPath(res.data);
        setPdfFileName(res.data.split("/").pop() || null);
      }
    } catch (e) {
      console.error("Failed to select PDF", e);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      let finalPdfPath = editingProject?.pdf_path || null;
      if (pdfPath && pdfPath !== editingProject?.pdf_path && vaultPath) {
        // Copy the selected PDF into the vault if it's new
        const copyRes = await ipc.invoke("fs:copyPdfAsset", vaultPath, pdfPath);
        if (copyRes.success && copyRes.data) {
          finalPdfPath = copyRes.data;
        }
      }

      const newProject = {
        ...(editingProject || {}),
        id: editingProject ? editingProject.id : nanoid(),
        name: name.trim(),
        type: addingProjectType,
        color: editingProject ? editingProject.color : bgClass,
        chapters: editingProject ? editingProject.chapters : [],
        author: author.trim() || null,
        url: url.trim() || null,
        pdf_path: finalPdfPath,
      };

      if (vaultPath) {
        await ipc.invoke("db:saveProject", vaultPath, newProject);
      }

      if (editingProject) {
        setProjects(
          projects.map((p) => (p.id === newProject.id ? newProject : p)),
        );
      } else {
        setProjects([...projects, newProject]);
      }

      // Reset and close
      setName("");
      setAuthor("");
      setUrl("");
      setPdfPath(null);
      setPdfFileName(null);
      setEditingProject(null);
      setIsNewProjectModalOpen(false);
    } catch (e) {
      console.error(`Failed to save ${typeTextLower}`, e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={isNewProjectModalOpen}
      onOpenChange={(open) => {
        setIsNewProjectModalOpen(open);
        if (!open) setEditingProject(null);
      }}
    >
      <DialogContent className="sm:max-w-lg p-0 flex flex-col overflow-hidden gap-0 bg-card rounded-2xl border-border sm:rounded-2xl">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-[#252528] bg-gray-50/50 dark:bg-black/20 m-0 space-y-0 text-left">
          <DialogTitle className="font-semibold text-lg text-foreground flex items-center gap-2">
            <TypeIcon size={18} className={colorClass} />
            {editingProject ? "Edit" : "Add New"} {typeText}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {editingProject
              ? `Edit ${typeTextLower} details`
              : `Add a new ${typeTextLower} to your vault`}
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
              {typeText} Title <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <TypeIcon size={16} className="text-gray-400" />
              </div>
              <input
                autoFocus
                type="text"
                placeholder={
                  isBook
                    ? "e.g. The Pragmatic Programmer"
                    : "e.g. Advanced React Patterns"
                }
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full bg-card border border-border rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 text-foreground transition-all ${focusRingClass}`}
              />
            </div>
          </div>

          {/* Author/Instructor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
              {isBook ? "Author" : "Instructor"}{" "}
              <span className="text-gray-400 font-normal text-xs">
                (Optional)
              </span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={
                  isBook
                    ? "e.g. David Thomas, Andrew Hunt"
                    : "e.g. Kent C. Dodds"
                }
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className={`w-full bg-card border border-border rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 text-foreground transition-all ${focusRingClass}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                {isBook ? "Read URL" : "Course URL"}{" "}
                <span className="text-gray-400 font-normal text-xs">
                  (Optional)
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LinkIcon size={16} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className={`w-full bg-card border border-border rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 text-foreground transition-all ${focusRingClass}`}
                />
              </div>
            </div>

            {/* PDF Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                Local PDF{" "}
                <span className="text-gray-400 font-normal text-xs">
                  (Optional)
                </span>
              </label>
              <button
                onClick={handleSelectPdf}
                className="w-full bg-gray-50 dark:bg-card hover:bg-gray-100 dark:hover:bg-[#2e2e30] border border-dashed border-gray-300 dark:border-[#444448] rounded-xl py-2.5 px-4 outline-none text-muted-foreground transition-all flex items-center justify-center gap-2 group"
              >
                <Upload
                  size={16}
                  className={`text-gray-400 transition-colors ${hoverIconClass}`}
                />
                <span className="truncate max-w-[120px] text-sm font-medium">
                  {pdfFileName || "Select PDF"}
                </span>
              </button>
            </div>
          </div>

          {pdfFileName && (
            <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/10 px-3 py-2 rounded-lg border border-green-100 dark:border-green-900/30 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              PDF will be copied into your vault automatically.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-[#252528] bg-gray-50/50 dark:bg-black/20 flex justify-end gap-3">
          <button
            onClick={() => {
              setIsNewProjectModalOpen(false);
              setEditingProject(null);
            }}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 flex items-center gap-2
                  ${
                    !name.trim() || isSaving
                      ? `opacity-50 cursor-not-allowed ${disabledBgClass} shadow-none`
                      : `${bgClass} ${hoverBgClass} ${shadowClass} active:scale-[0.98]`
                  }`}
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {isSaving
              ? "Saving..."
              : editingProject
                ? "Save Changes"
                : `Create ${typeText}`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
