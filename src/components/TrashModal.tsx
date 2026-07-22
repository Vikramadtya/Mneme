import React, { useState, useEffect } from "react";
import { Trash2, RefreshCw, X, AlertTriangle } from "lucide-react";
import { ipc } from "../ipc";
import { useVault, useUI, useNotes } from "../application/context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

export function TrashModal() {
  const vaultPath = useVault((s) => s.vaultPath);
  const trashOpen = useUI((s) => s.trashOpen);
  const setTrashOpen = useUI((s) => s.setTrashOpen);
  const showToast = useUI((s) => s.showToast);
  const handleSync = useVault((s: any) => s.handleSync);

  const [trashFiles, setTrashFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [isEmptying, setIsEmptying] = useState(false);

  useEffect(() => {
    if (trashOpen && vaultPath) {
      loadTrash();
    }
  }, [trashOpen, vaultPath]);

  const loadTrash = async () => {
    if (!vaultPath) return;
    setIsLoading(true);
    try {
      const res = await ipc.invoke("db:getTrash", vaultPath);
      if (res.success) {
        setTrashFiles(res.data as unknown as any[]);
      } else {
        showToast("Failed to load trash: " + res.error, "error");
      }
    } catch (e: any) {
      showToast("Error loading trash: " + e.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (fileName: string) => {
    if (!vaultPath) return;
    setIsRestoring(fileName);
    try {
      const res = await ipc.invoke("db:restoreNote", vaultPath, fileName);
      if (res.success) {
        showToast("Note restored successfully!", "success");
        await loadTrash(); // Refresh list
        await handleSync(); // Sync the db so it shows up in sidebar
      } else {
        showToast("Failed to restore note: " + res.error, "error");
      }
    } catch (e: any) {
      showToast("Error restoring note: " + e.message, "error");
    } finally {
      setIsRestoring(null);
    }
  };

  const handleEmptyTrash = async () => {
    if (!vaultPath) return;
    if (
      !window.confirm(
        "Are you sure you want to permanently delete all items in the Trash? This cannot be undone.",
      )
    )
      return;

    setIsEmptying(true);
    try {
      const res = await ipc.invoke("db:emptyTrash", vaultPath);
      if (res.success) {
        showToast("Trash emptied successfully.", "success");
        setTrashFiles([]);
      } else {
        showToast("Failed to empty trash: " + res.error, "error");
      }
    } catch (e: any) {
      showToast("Error emptying trash: " + e.message, "error");
    } finally {
      setIsEmptying(false);
    }
  };

  return (
    <Dialog open={trashOpen} onOpenChange={setTrashOpen}>
      <DialogContent className="max-w-2xl bg-white dark:bg-[#1a1a1c] border border-border flex flex-col max-h-[80vh]">
        <DialogHeader className="pb-4 border-b border-border flex-shrink-0">
          <div className="flex justify-between items-center">
            <DialogTitle className="flex items-center text-foreground font-bold text-lg">
              <Trash2 className="w-5 h-5 mr-2 text-gray-500" /> Trash Bin
            </DialogTitle>
            <button
              onClick={handleEmptyTrash}
              disabled={isEmptying || trashFiles.length === 0}
              className="flex items-center px-3 py-1.5 text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
              {isEmptying ? "Emptying..." : "Empty Trash"}
            </button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-grow py-4 min-h-[300px]">
          {isLoading ? (
            <div className="flex justify-center items-center h-full text-gray-400 text-sm">
              Loading trash...
            </div>
          ) : trashFiles.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-gray-400 space-y-3">
              <Trash2 className="w-12 h-12 opacity-20" />
              <p className="text-sm">The trash is empty.</p>
            </div>
          ) : (
            <div className="space-y-2 pr-2">
              {trashFiles.map((file) => (
                <div
                  key={file.fileName}
                  className="flex justify-between items-center p-3 rounded-lg border border-border bg-gray-50 dark:bg-[#252528]"
                >
                  <div className="overflow-hidden">
                    <p
                      className="text-sm font-semibold text-foreground truncate"
                      title={file.originalName}
                    >
                      {file.originalName.replace(/\.md$/, "")}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Deleted: {new Date(file.deletedAt).toLocaleString()} •{" "}
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestore(file.fileName)}
                    disabled={isRestoring === file.fileName}
                    className="flex-shrink-0 ml-4 flex items-center px-3 py-1.5 bg-[#007aff]/10 text-[#007aff] hover:bg-[#007aff]/20 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 mr-1.5 ${isRestoring === file.fileName ? "animate-spin" : ""}`}
                    />
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
