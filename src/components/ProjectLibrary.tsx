import React, { useState } from "react";
import {
  Book,
  FileText,
  ExternalLink,
  Library,
  LibraryBig,
  GraduationCap,
  MonitorPlay,
  Trash2,
  Edit2,
} from "lucide-react";
import { useNotes, useVault, useUI } from "../application/context";
import type { Project } from "../types";
import { ipcClient } from "@/api/ipcClient";
import { DeleteConfirmModal } from "./DeleteConfirmModal";

type ProjectLibraryProps = {
  type: "book" | "course";
};

export function ProjectLibrary({ type }: ProjectLibraryProps) {
  const projects = useNotes((s) => s.projects);
  const allNotesFlat = useNotes((s) => s.allNotesFlat);
  const setActiveProjectId = useNotes((s) => s.setActiveProjectId);
  const setActivePdf = useNotes((s) => s.setActivePdf);
  const vaultPath = useVault((s) => s.vaultPath);
  const setIsNewProjectModalOpen = useUI(
    (s: any) => s.setIsNewProjectModalOpen,
  );
  const setEditingProject = useVault((s: any) => s.setEditingProject);
  const setAddingProjectType = useUI((s: any) => s.setAddingProjectType);
  const deleteProject = useNotes((s: any) => s.deleteProject);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const setActiveTab = useUI((s) => s.setActiveTab);
  const setProjectViewMode = useUI((s) => s.setProjectViewMode);

  const filteredProjects = projects.filter((p: Project) => p.type === type);

  const isBook = type === "book";
  const TitleIcon = isBook ? Library : LibraryBig;
  const CardIcon = isBook ? Book : GraduationCap;
  const titleText = isBook ? "Books Library" : "Courses Library";
  const colorClass = isBook ? "blue" : "purple";
  const textClass = isBook ? "text-blue-500" : "text-purple-500";
  const bgClass = isBook ? "bg-blue-500" : "bg-purple-500";
  const hoverBgClass = isBook ? "hover:bg-blue-600" : "hover:bg-purple-600";
  const shadowClass = isBook ? "shadow-blue-500/20" : "shadow-purple-500/20";
  const cardHoverShadow = isBook
    ? "hover:shadow-blue-500/5"
    : "hover:shadow-purple-500/5";

  const handleOpenPdf = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    if (project.pdf_path && vaultPath) {
      const fullPath = `file://${vaultPath}/docs/${project.pdf_path}`;
      setActivePdf(fullPath);
    }
  };

  const handleOpenUrl = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    if (project.url) {
      await ipcClient.app.openExternal(project.url);
    }
  };

  const openNewModal = () => {
    setIsNewProjectModalOpen(true, type);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background p-8 pb-32">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1
              className={`text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3`}
            >
              <TitleIcon className={textClass} size={32} />
              {titleText}
            </h1>
            <p className="text-muted-foreground mt-2">
              Your collection of {filteredProjects.length}{" "}
              {filteredProjects.length === 1 ? type : type + "s"} and{" "}
              {isBook ? "reading" : "study"} materials.
            </p>
          </div>
          <button
            onClick={openNewModal}
            className={`${bgClass} ${hoverBgClass} text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg ${shadowClass} flex items-center gap-2 group`}
          >
            <CardIcon
              size={16}
              className="group-hover:scale-110 transition-transform"
            />
            Add New {isBook ? "Book" : "Course"}
          </button>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-3xl bg-white/50 dark:bg-card/50">
            <div
              className={`w-16 h-16 ${isBook ? "bg-blue-100 dark:bg-blue-900/30" : "bg-purple-100 dark:bg-purple-900/30"} rounded-2xl flex items-center justify-center mb-4`}
            >
              <CardIcon className={textClass} size={32} />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No {type}s yet
            </h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              {isBook
                ? "Start building your library. Add books to organize notes, upload PDFs, and track your reading."
                : "Start tracking your learning. Add courses to take notes, structure modules, and organize your progress."}
            </p>
            <button
              onClick={openNewModal}
              className="bg-card hover:bg-accent hover:text-accent-foreground text-foreground border border-border px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm"
            >
              Add your first {type}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProjects.map((project: Project) => {
              // Count notes in this project and its chapters/modules
              const projectNotes = allNotesFlat.filter(
                (n: any) =>
                  n.project_id === project.id ||
                  (project.chapters &&
                    project.chapters.some((c: any) => c.id === n.project_id)),
              );

              return (
                <div
                  key={project.id}
                  onClick={() => {
                    setActiveProjectId(project.id);
                    setProjectViewMode("toc");
                    setActiveTab("project");
                  }}
                  className={`group relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl ${cardHoverShadow} hover:-translate-y-1 transition-all cursor-pointer flex flex-col`}
                >
                  {/* Card Header Pattern */}
                  <div
                    className={`h-24 ${project.color || bgClass} opacity-80 group-hover:opacity-100 transition-opacity flex items-end p-4 relative overflow-hidden`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <CardIcon className="text-white/20 absolute -right-4 -bottom-4 w-24 h-24 transform -rotate-12 group-hover:scale-110 transition-transform duration-500" />

                    <div className="relative z-10 flex gap-2">
                      {project.pdf_path && (
                        <span className="bg-red-500/90 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                          <FileText size={10} /> PDF
                        </span>
                      )}
                      {project.platform && (
                        <span className="bg-black/40 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 border border-white/10">
                          <MonitorPlay size={10} /> {project.platform}
                        </span>
                      )}
                      {project.url && (
                        <span
                          className={`${bgClass}/90 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1`}
                        >
                          <ExternalLink size={10} /> URL
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col">
                    <h3
                      className={`font-bold text-gray-800 dark:text-gray-100 text-lg leading-tight mb-1 line-clamp-2 group-hover:${textClass} transition-colors`}
                    >
                      {project.name}
                    </h3>

                    {(project.author || project.instructor) && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-1">
                        by {project.author || project.instructor}
                      </p>
                    )}

                    <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-50 dark:border-[#2e2e30]">
                      <div className="text-xs text-gray-400 font-medium bg-muted px-2 py-1 rounded-md">
                        {projectNotes.length} notes
                      </div>

                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {project.pdf_path && (
                          <button
                            onClick={(e) => handleOpenPdf(e, project)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Read PDF"
                          >
                            <FileText size={16} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProject(project);
                            setAddingProjectType(project.type || "book");
                            setIsNewProjectModalOpen(true);
                          }}
                          className={`p-1.5 text-gray-400 hover:${textClass} ${isBook ? "hover:bg-blue-50 dark:hover:bg-blue-900/20" : "hover:bg-purple-50 dark:hover:bg-purple-900/20"} rounded-lg transition-colors`}
                          title={`Edit ${isBook ? "Book" : "Course"}`}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingProject(project);
                            setDeleteConfirmOpen(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title={`Delete ${isBook ? "Book" : "Course"}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeletingProject(null);
        }}
        onConfirm={() => {
          if (deletingProject) {
            deleteProject(deletingProject.id);
          }
        }}
        title={`Delete ${deletingProject?.type === "book" ? "Book" : "Course"}`}
        description={
          <>
            Are you sure you want to delete{" "}
            <strong>{deletingProject?.name}</strong>? This will also delete all
            its associated{" "}
            {deletingProject?.type === "book" ? "chapters" : "modules"} and
            notes. This action cannot be undone.
          </>
        }
        confirmText="Delete"
      />
    </div>
  );
}
