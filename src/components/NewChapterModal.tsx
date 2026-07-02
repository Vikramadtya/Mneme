import React, { useState, useEffect } from "react";
import { X, Book, MonitorPlay } from "lucide-react";
import { useUI, useNotes } from "../application/context";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";

export function NewChapterModal() {
  const addingChapterTo = useUI((s) => s.addingChapterTo);
  const setAddingChapterTo = useUI((s) => s.setAddingChapterTo);
  const addingProjectType = useUI((s) => s.addingProjectType);
  const handleAddChapter = useNotes((s) => s.handleAddChapter);
  const projects = useNotes((s) => s.projects);
  const [number, setNumber] = useState("1");
  const [name, setName] = useState("");

  const project = projects.find((p: any) => p.id === addingChapterTo);
  const type = project?.type || "book"; // "book" or "course"

  useEffect(() => {
    if (addingChapterTo && project) {
      // Auto-increment chapter number based on existing chapters
      const count = project.chapters?.length || 0;
      setNumber((count + 1).toString());
      setName("");
    }
  }, [addingChapterTo, project]);

  const isBook = type === "book";
  const title = isBook ? "Add New Chapter" : "Add New Module";
  const numLabel = isBook ? "Chapter Number" : "Module Number";
  const nameLabel = isBook ? "Chapter Name" : "Module Name";
  const Icon = isBook ? Book : MonitorPlay;
  const placeholder = isBook ? "e.g., Introduction" : "e.g., Getting Started";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const finalName = `${isBook ? "Chapter" : "Module"} ${number}: ${name.trim()}`;
    handleAddChapter(addingChapterTo, finalName);
  };

  return (
    <Dialog
      open={!!addingChapterTo}
      onOpenChange={(open) => !open && setAddingChapterTo(null)}
    >
      <DialogContent className="sm:max-w-md p-0 flex flex-col overflow-hidden gap-0 bg-card rounded-3xl border-border sm:rounded-3xl">
        <DialogHeader className="p-6 pb-0 border-none m-0 space-y-0 text-left">
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Icon className="text-purple-500" size={24} />
            {title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Add a new chapter or module
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {numLabel}
              </label>
              <input
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {nameLabel}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={placeholder}
                autoFocus
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-gray-900 dark:text-white"
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setAddingChapterTo(null)}
                className="flex-1 px-4 py-2.5 rounded-xl font-medium bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl font-medium bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-purple-500/20 transition-all"
              >
                Add {isBook ? "Chapter" : "Module"}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
