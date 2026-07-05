import React from "react";
import { Book, FileText, ExternalLink, Library } from "lucide-react";
import { useNotes, useVault, useUI } from "../application/context";
import type { Project } from "../types";
import { ipc } from "../ipc";

export function BooksLibrary() {
  const projects = useNotes((s) => s.projects);
  const allNotesFlat = useNotes((s) => s.allNotesFlat);
  const setActiveProjectId = useNotes((s) => s.setActiveProjectId);
  const setActivePdf = useNotes((s) => s.setActivePdf);
  const vaultPath = useVault((s) => s.vaultPath);
  const setIsNewBookModalOpen = useUI((s) => s.setIsNewBookModalOpen);
  const setActiveTab = useUI((s) => s.setActiveTab);
  const setProjectViewMode = useUI((s) => s.setProjectViewMode);

  const books = projects.filter((p: Project) => p.type === "book");

  const handleOpenPdf = (e: React.MouseEvent, book: Project) => {
    e.stopPropagation();
    if (book.pdf_path && vaultPath) {
      const fullPath = `file://${vaultPath}/docs/${book.pdf_path}`;
      setActivePdf(fullPath);
    }
  };

  const handleOpenUrl = async (e: React.MouseEvent, book: Project) => {
    e.stopPropagation();
    if (book.url) {
      await ipc.invoke("app:openExternal", book.url);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background p-8 pb-32">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Library className="text-blue-500" size={32} />
              Books Library
            </h1>
            <p className="text-muted-foreground mt-2">
              Your collection of {books.length}{" "}
              {books.length === 1 ? "book" : "books"} and reading materials.
            </p>
          </div>
          <button
            onClick={() => setIsNewBookModalOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 group"
          >
            <Book
              size={16}
              className="group-hover:scale-110 transition-transform"
            />
            Add New Book
          </button>
        </div>

        {books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-3xl bg-white/50 dark:bg-card/50">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-4">
              <Book className="text-blue-500" size={32} />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No books yet
            </h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Start building your library. Add books to organize notes, upload
              PDFs, and track your reading.
            </p>
            <button
              onClick={() => setIsNewBookModalOpen(true)}
              className="bg-card hover:bg-accent hover:text-accent-foreground text-foreground border border-border px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm"
            >
              Add your first book
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {books.map((book: Project) => {
              // Count notes in this book and its chapters
              const bookNotes = allNotesFlat.filter(
                (n: any) =>
                  n.project_id === book.id ||
                  (book.chapters &&
                    book.chapters.some((c: any) => c.id === n.project_id)),
              );

              return (
                <div
                  key={book.id}
                  onClick={() => {
                    setActiveProjectId(book.id);
                    setProjectViewMode("toc");
                    setActiveTab("project");
                  }}
                  className="group relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all cursor-pointer flex flex-col"
                >
                  {/* Card Header Pattern */}
                  <div
                    className={`h-24 ${book.color} opacity-80 group-hover:opacity-100 transition-opacity flex items-end p-4 relative overflow-hidden`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <Book className="text-white/20 absolute -right-4 -bottom-4 w-24 h-24 transform -rotate-12 group-hover:scale-110 transition-transform duration-500" />

                    <div className="relative z-10 flex gap-2">
                      {book.pdf_path && (
                        <span className="bg-red-500/90 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                          <FileText size={10} /> PDF
                        </span>
                      )}
                      {book.url && (
                        <span className="bg-blue-500/90 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                          <ExternalLink size={10} /> URL
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg leading-tight mb-1 line-clamp-2 group-hover:text-blue-500 transition-colors">
                      {book.name}
                    </h3>

                    {book.author && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-1">
                        by {book.author}
                      </p>
                    )}

                    <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-50 dark:border-[#2e2e30]">
                      <div className="text-xs text-gray-400 font-medium bg-muted px-2 py-1 rounded-md">
                        {bookNotes.length} notes
                      </div>

                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {book.pdf_path && (
                          <button
                            onClick={(e) => handleOpenPdf(e, book)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Read PDF"
                          >
                            <FileText size={16} />
                          </button>
                        )}
                        {book.url && (
                          <button
                            onClick={(e) => handleOpenUrl(e, book)}
                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
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
