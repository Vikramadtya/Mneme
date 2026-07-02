import { useState } from "react";
import {
  X,
  GraduationCap,
  Link as LinkIcon,
  User,
  Save,
  MonitorPlay,
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

export function NewCourseModal() {
  const vaultPath = useVault((s) => s.vaultPath);
  const projects = useNotes((s) => s.projects);
  const setProjects = useNotes((s) => s.setProjects);
  const isNewCourseModalOpen = useUI((s) => s.isNewCourseModalOpen);
  const setIsNewCourseModalOpen = useUI((s) => s.setIsNewCourseModalOpen);

  const [name, setName] = useState("");
  const [instructor, setInstructor] = useState("");
  const [platform, setPlatform] = useState("");
  const [url, setUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const newProject = {
        id: nanoid(),
        name: name.trim(),
        type: "course" as any,
        color: "bg-purple-500", // Default nice color for courses
        chapters: [],
        instructor: instructor.trim() || null,
        platform: platform.trim() || null,
        url: url.trim() || null,
      };

      if (vaultPath) {
        await ipc.saveProject(vaultPath, newProject);
      }

      setProjects([...projects, newProject]);

      // Reset and close
      setName("");
      setInstructor("");
      setPlatform("");
      setUrl("");
      setIsNewCourseModalOpen(false);
    } catch (e) {
      console.error("Failed to save course", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isNewCourseModalOpen} onOpenChange={setIsNewCourseModalOpen}>
      <DialogContent className="sm:max-w-lg p-0 flex flex-col overflow-hidden gap-0 bg-card rounded-2xl border-border sm:rounded-2xl">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-[#252528] bg-gray-50/50 dark:bg-black/20 m-0 space-y-0 text-left">
          <DialogTitle className="font-semibold text-lg text-foreground flex items-center gap-2">
            <GraduationCap size={18} className="text-purple-500" />
            Add New Course
          </DialogTitle>
          <DialogDescription className="sr-only">
            Add a new course to your vault
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Course Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
              Course Title <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <GraduationCap size={16} className="text-gray-400" />
              </div>
              <input
                autoFocus
                type="text"
                placeholder="e.g. Master React in 30 Days"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-card border border-border rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-foreground transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Instructor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                Instructor{" "}
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
                  placeholder="e.g. John Doe"
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-foreground transition-all"
                />
              </div>
            </div>

            {/* Platform */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                Platform{" "}
                <span className="text-gray-400 font-normal text-xs">
                  (Optional)
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MonitorPlay size={16} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. Udemy, YouTube"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-foreground transition-all"
                />
              </div>
            </div>
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
              Course URL{" "}
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
                className="w-full bg-card border border-border rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-foreground transition-all"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-[#252528] bg-gray-50/50 dark:bg-black/20 flex justify-end gap-3">
          <button
            onClick={() => setIsNewCourseModalOpen(false)}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#333336] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className={`px-5 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
              !name.trim() || isSaving
                ? "bg-purple-300 dark:bg-purple-900/50 text-white cursor-not-allowed"
                : "bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/20"
            }`}
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {isSaving ? "Saving..." : "Create Course"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
