import React, { useState } from "react";
import {
  X,
  GitCommit,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useVault } from "../application/context";

export function SyncCommitModal() {
  const isSyncModalOpen = useVault((s) => s.isSyncModalOpen);
  const setIsSyncModalOpen = useVault((s) => s.setIsSyncModalOpen);
  const gitStatusForSync = useVault((s) => s.gitStatusForSync);
  const performActualSync = useVault((s) => s.performActualSync);
  const [commitMessage, setCommitMessage] = useState("Auto sync commit");

  if (!isSyncModalOpen || !gitStatusForSync) return null;

  const allFiles = gitStatusForSync.files || [];

  const handleConfirm = () => {
    performActualSync(commitMessage.trim());
  };

  const handleClose = () => {
    setIsSyncModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border bg-[#f5f5f7]/50 dark:bg-black/20">
          <div className="flex items-center gap-2">
            <GitCommit className="text-blue-500" size={20} />
            <h2 className="text-xl font-bold text-foreground">
              Review Changes
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar bg-background">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Commit Message
            </label>
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#007aff]"
              placeholder="Enter commit message..."
              autoFocus
            />
          </div>

          <div className="mb-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Uncommitted Changes ({allFiles.length})
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              The following files will be committed and pushed to your remote
              repository.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
            {allFiles.length > 0 ? (
              <ul className="divide-y divide-gray-200 dark:divide-zinc-800">
                {allFiles.map((file: any, index: number) => (
                  <li
                    key={index}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <FileText size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate flex-1">
                      {file.path}
                    </span>
                    {file.index === "M" || file.working_dir === "M" ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        Modified
                      </span>
                    ) : file.index === "A" || file.working_dir === "?" ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Added
                      </span>
                    ) : file.index === "D" || file.working_dir === "D" ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        Deleted
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 dark:bg-zinc-800 dark:text-gray-400">
                        Changed
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center text-gray-500">
                <CheckCircle2 size={32} className="text-green-500 mb-2" />
                <p>No uncommitted changes detected.</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border bg-[#f5f5f7]/50 dark:bg-black/20 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 text-sm font-semibold rounded-xl bg-[#007aff] hover:bg-[#0056b3] text-white shadow-md transition-all flex items-center gap-2"
          >
            Confirm & Sync
          </button>
        </div>
      </div>
    </div>
  );
}
