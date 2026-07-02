import { MarkdownRenderer } from "./MarkdownRenderer";
import { History, X } from "lucide-react";
import { useVault, useNotes, useUI } from "../application/context";
import { preprocessMarkdown } from "../utils/markdownUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";

export function HistoryModal() {
  const vaultPath = useVault((s) => s.vaultPath);
  const vaultSettings = useVault((s) => s.vaultSettings);
  const activeHistoryNote = useNotes((s) => s.activeHistoryNote);
  const noteHistory = useNotes((s) => s.noteHistory);
  const setNoteHistory = useNotes((s) => s.setNoteHistory);
  const viewingCommitHash = useNotes((s) => s.viewingCommitHash);
  const historicalContent = useNotes((s) => s.historicalContent);
  const setHistoricalContent = useNotes((s) => s.setHistoricalContent);
  const isHistoryOpen = useUI((s) => s.isHistoryOpen);
  const setIsHistoryOpen = useUI((s) => s.setIsHistoryOpen);
  const handleViewCommit = useUI((s) => s.handleViewCommit);
  const handleRestoreCommit = useUI((s) => s.handleRestoreCommit);

  const handleOpenChange = (open: boolean) => {
    setIsHistoryOpen(open);
    if (!open) {
      setNoteHistory([]);
      setHistoricalContent(null);
    }
  };

  if (!activeHistoryNote) return null;

  return (
    <Dialog open={isHistoryOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 flex flex-row overflow-hidden gap-0 bg-card rounded-xl border-border sm:rounded-xl">
        <DialogTitle className="sr-only">Note History</DialogTitle>
        <DialogDescription className="sr-only">
          View history of the selected note.
        </DialogDescription>
        {/* Sidebar (List of commits) */}
        <div className="w-[300px] border-r border-border bg-[#f4f4f5]/50 dark:bg-[#1a1a1c]/50 flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-[#1c1c1e] dark:text-white flex items-center">
              <History size={18} className="mr-2 text-purple-500" /> Note
              History
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {noteHistory.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                No history found for this note. Save it to create a version!
              </div>
            ) : (
              noteHistory.map((commit: any) => (
                <button
                  key={commit.hash}
                  onClick={() =>
                    handleViewCommit(activeHistoryNote.id, commit.hash)
                  }
                  className={`w-full text-left p-4 border-b border-border hover:bg-[#e4e4e7]/50 dark:hover:bg-[#333336]/50 transition-colors ${viewingCommitHash === commit.hash ? "bg-[#e4e4e7] dark:bg-[#333336]" : ""}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-mono text-purple-500">
                      {commit.hash.substring(0, 7)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(commit.date).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-[#1c1c1e] dark:text-gray-200 truncate">
                    {commit.message}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Content (Viewer) */}
        <div className="flex-1 flex flex-col bg-card">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-[#1c1c1e] dark:text-white">
              {viewingCommitHash
                ? `Viewing Revision ${viewingCommitHash.substring(0, 7)}`
                : "Select a revision"}
            </h3>
            <div className="flex items-center gap-2">
              {viewingCommitHash && (
                <button
                  onClick={() => handleRestoreCommit(activeHistoryNote)}
                  className="bg-purple-500 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-purple-600 transition-colors"
                >
                  Restore This Version
                </button>
              )}
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="flex-1 p-6 overflow-y-auto">
            {viewingCommitHash ? (
              historicalContent === null ? (
                <div className="text-gray-500 flex justify-center mt-10">
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="h-4 bg-gray-200 rounded w-48 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-64 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <MarkdownRenderer content={historicalContent} />
                </div>
              )
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500 text-sm">
                Select a commit from the sidebar to view its content.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
