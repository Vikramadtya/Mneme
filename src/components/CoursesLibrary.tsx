import React from "react";
import {
  GraduationCap,
  ExternalLink,
  MonitorPlay,
  LibraryBig,
} from "lucide-react";
import { useNotes, useUI } from "../application/context";
import type { Project } from "../types";
import { ipc } from "../ipc";

export function CoursesLibrary() {
  const projects = useNotes((s) => s.projects);
  const allNotesFlat = useNotes((s) => s.allNotesFlat);
  const setActiveProjectId = useNotes((s) => s.setActiveProjectId);
  const setIsNewCourseModalOpen = useUI((s) => s.setIsNewCourseModalOpen);
  const setActiveTab = useUI((s) => s.setActiveTab);
  const setProjectViewMode = useUI((s) => s.setProjectViewMode);

  const courses = projects.filter((p: Project) => p.type === "course");

  const handleOpenUrl = async (e: React.MouseEvent, course: Project) => {
    e.stopPropagation();
    if (course.url) {
      await ipc.openExternal(course.url);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background p-8 pb-32">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <LibraryBig className="text-purple-500" size={32} />
              Courses Library
            </h1>
            <p className="text-muted-foreground mt-2">
              Your collection of {courses.length}{" "}
              {courses.length === 1 ? "course" : "courses"} and study materials.
            </p>
          </div>
          <button
            onClick={() => setIsNewCourseModalOpen(true)}
            className="bg-purple-500 hover:bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2 group"
          >
            <GraduationCap
              size={16}
              className="group-hover:scale-110 transition-transform"
            />
            Add New Course
          </button>
        </div>

        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-3xl bg-white/50 dark:bg-card/50">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mb-4">
              <GraduationCap className="text-purple-500" size={32} />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No courses yet
            </h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Start tracking your learning. Add courses to take notes, structure
              chapters, and organize your progress.
            </p>
            <button
              onClick={() => setIsNewCourseModalOpen(true)}
              className="bg-card hover:bg-accent hover:text-accent-foreground text-foreground border border-border px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm"
            >
              Add your first course
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course: Project) => {
              // Count notes in this course and its chapters
              const courseNotes = allNotesFlat.filter(
                (n: any) =>
                  n.project_id === course.id ||
                  (course.chapters &&
                    course.chapters.some((c: any) => c.id === n.project_id)),
              );

              return (
                <div
                  key={course.id}
                  onClick={() => {
                    setActiveProjectId(course.id);
                    setProjectViewMode("toc");
                    setActiveTab("project");
                  }}
                  className="group relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl hover:shadow-purple-500/5 hover:-translate-y-1 transition-all cursor-pointer flex flex-col"
                >
                  {/* Card Header Pattern */}
                  <div
                    className={`h-24 ${course.color || "bg-purple-500"} opacity-80 group-hover:opacity-100 transition-opacity flex items-end p-4 relative overflow-hidden`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <GraduationCap className="text-white/20 absolute -right-4 -bottom-4 w-24 h-24 transform -rotate-12 group-hover:scale-110 transition-transform duration-500" />

                    <div className="relative z-10 flex gap-2">
                      {course.platform && (
                        <span className="bg-black/40 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 border border-white/10">
                          <MonitorPlay size={10} /> {course.platform}
                        </span>
                      )}
                      {course.url && (
                        <span className="bg-purple-500/90 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                          <ExternalLink size={10} /> URL
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg leading-tight mb-1 line-clamp-2 group-hover:text-purple-500 transition-colors">
                      {course.name}
                    </h3>

                    {course.instructor && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-1">
                        by {course.instructor}
                      </p>
                    )}

                    <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-50 dark:border-[#2e2e30]">
                      <div className="text-xs text-gray-400 font-medium bg-muted px-2 py-1 rounded-md">
                        {courseNotes.length} notes
                      </div>

                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {course.url && (
                          <button
                            onClick={(e) => handleOpenUrl(e, course)}
                            className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                            title="Open Link"
                          >
                            <ExternalLink size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
