import React from "react";
import {
  NotebookPen,
  CircleDashed,
  PlusCircle,
  Star,
  FileText,
} from "lucide-react";
import { useNotes, useUI } from "../../application/context";

export function ProjectTocView({ rootProject }: { rootProject: any }) {
  const allNotesMap = useNotes((s: any) => s.allNotesMap);
  const selectProject = useNotes((s: any) => s.selectProject);
  const activeProject = useNotes((s: any) => s.activeProject);

  const setAddingChapterTo = useUI((s: any) => s.setAddingChapterTo);
  const setProjectViewMode = useUI((s: any) => s.setProjectViewMode);

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-8">
      <h2 className="text-xl font-bold mb-6 text-foreground flex items-center">
        <NotebookPen className="mr-2 text-[#007aff]" size={20} /> Table of
        Contents
      </h2>
      <div className="space-y-6">
        {(!rootProject?.chapters || rootProject.chapters.length === 0) && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-gray-50/50 dark:bg-gray-800/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <CircleDashed size={32} className="text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              No {rootProject?.type === "course" ? "Modules" : "Chapters"} Yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Organize your {rootProject?.type} by adding{" "}
              {rootProject?.type === "course" ? "modules" : "chapters"} to group
              related notes together.
            </p>
            <button
              onClick={() => {
                setAddingChapterTo(rootProject.id);
              }}
              className="bg-[#007aff] hover:bg-[#0066cc] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
            >
              <PlusCircle size={14} className="mr-2" /> Add{" "}
              {rootProject?.type === "course" ? "Module" : "Chapter"}
            </button>
          </div>
        )}
        {rootProject?.chapters?.map((chapter: any) => {
          let chapterNotes = allNotesMap[chapter.id] || [];
          chapterNotes = [...chapterNotes].sort((a: any, b: any) => {
            const aOrder = a.sort_order || 0;
            const bOrder = b.sort_order || 0;
            if (aOrder !== bOrder) return aOrder - bOrder;
            if (a.favourite && !b.favourite) return -1;
            if (!a.favourite && b.favourite) return 1;
            return 0;
          });
          return (
            <div key={chapter.id}>
              <h3
                onClick={() => selectProject(rootProject.id, chapter.id)}
                className="text-lg font-bold text-foreground hover:text-[#007aff] dark:hover:text-[#007aff] transition-colors cursor-pointer flex items-center mb-3"
              >
                <CircleDashed size={16} className="mr-2 text-[#007aff]" />{" "}
                {chapter.name}
              </h3>
              <ul className="pl-6 space-y-2.5 border-l-2 border-gray-100 dark:border-gray-800 ml-2">
                {chapterNotes.length === 0 ? (
                  <li className="text-sm text-muted-foreground/60 italic flex items-center">
                    <FileText size={14} className="mr-2 opacity-50" />
                    Empty{" "}
                    {rootProject?.type === "course" ? "module" : "chapter"}
                  </li>
                ) : (
                  chapterNotes.map((n: any, idx: number) => (
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
                          {!!n.favourite && (
                            <Star
                              size={12}
                              className="mr-1.5 fill-[#eab308] text-[#eab308]"
                            />
                          )}
                          <span className="text-muted-foreground mr-2 font-medium">
                            {idx + 1}.
                          </span>{" "}
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
                  const aOrder = a.sort_order || 0;
                  const bOrder = b.sort_order || 0;
                  if (aOrder !== bOrder) return aOrder - bOrder;
                  if (a.favourite && !b.favourite) return -1;
                  if (!a.favourite && b.favourite) return 1;
                  return 0;
                })
                .map((n: any, idx: number) => (
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
                        {!!n.favourite && (
                          <Star
                            size={12}
                            className="mr-1.5 fill-[#eab308] text-[#eab308]"
                          />
                        )}
                        <span className="text-muted-foreground mr-2 font-medium">
                          {idx + 1}.
                        </span>{" "}
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
  );
}
