import { useState } from "react";
import { X, Upload, Book, Link as LinkIcon, User, Save } from "lucide-react";
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

export function NewBookModal() {
  const vaultPath = useVault((s) => s.vaultPath);
  const projects = useNotes((s) => s.projects);
  const setProjects = useNotes((s) => s.setProjects);
  const isNewBookModalOpen = useUI((s) => s.isNewBookModalOpen);
  const setIsNewBookModalOpen = useUI((s) => s.setIsNewBookModalOpen);

  const [name, setName] = useState("");
  const [author, setAuthor] = useState("");
  const [url, setUrl] = useState("");
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
      let finalPdfPath = null;
      if (pdfPath && vaultPath) {
        // Copy the selected PDF into the vault
        const copyRes = await ipc.invoke("fs:copyPdfAsset", vaultPath, pdfPath);
        if (copyRes.success && copyRes.data) {
          finalPdfPath = copyRes.data;
        }
      }

      const newProject = {
        id: nanoid(),
        name: name.trim(),
        type: "book" as any,
        color: "bg-blue-500", // Default nice color for books
        chapters: [],
        author: author.trim() || null,
        url: url.trim() || null,
        pdf_path: finalPdfPath,
      };

      if (vaultPath) {
        await ipc.invoke("db:saveProject", vaultPath, newProject);
      }

      setProjects([...projects, newProject]);

      // Reset and close
      setName("");
      setAuthor("");
      setUrl("");
      setPdfPath(null);
      setPdfFileName(null);
      setIsNewBookModalOpen(false);
    } catch (e) {
      console.error("Failed to save book", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isNewBookModalOpen} onOpenChange={setIsNewBookModalOpen}>
      <DialogContent className="sm:max-w-lg p-0 flex flex-col overflow-hidden gap-0 bg-card rounded-2xl border-border sm:rounded-2xl">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-[#252528] bg-gray-50/50 dark:bg-black/20 m-0 space-y-0 text-left">
          <DialogTitle className="font-semibold text-lg text-foreground flex items-center gap-2">
            <Book size={18} className="text-blue-500" />
            Add New Book
          </DialogTitle>
          <DialogDescription className="sr-only">
            Add a new book to your vault
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Book Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
              Book Title <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Book size={16} className="text-gray-400" />
              </div>
              <input
                autoFocus
                type="text"
                placeholder="e.g. The Pragmatic Programmer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-card border border-border rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-foreground transition-all"
              />
            </div>
          </div>

          {/* Author */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
              Author{" "}
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
                placeholder="e.g. David Thomas, Andrew Hunt"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-card border border-border rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-foreground transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                Read URL{" "}
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
                  className="w-full bg-card border border-border rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-foreground transition-all"
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
                  className="text-gray-400 group-hover:text-blue-500 transition-colors"
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
            onClick={() => setIsNewBookModalOpen(false)}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#333336] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className={`px-5 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
              !name.trim() || isSaving
                ? "bg-blue-300 dark:bg-blue-900/50 text-white cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20"
            }`}
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {isSaving ? "Saving..." : "Create Book"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
