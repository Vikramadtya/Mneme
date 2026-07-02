import { X, GitCommit } from "lucide-react";
import { useNotes, useUI } from "../application/context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";

export function VaultHistoryModal() {
  const vaultHistory = useNotes((s) => s.vaultHistory);
  const isVaultHistoryOpen = useUI((s) => s.isVaultHistoryOpen);
  const setIsVaultHistoryOpen = useUI((s) => s.setIsVaultHistoryOpen);

  return (
    <Dialog open={isVaultHistoryOpen} onOpenChange={setIsVaultHistoryOpen}>
      <DialogContent className="max-w-3xl h-[80vh] p-0 flex flex-col overflow-hidden gap-0 bg-card rounded-xl border-border sm:rounded-xl">
        <DialogHeader className="p-4 border-b border-border flex flex-row items-center justify-between bg-[#f4f4f5]/50 dark:bg-[#1a1a1c]/50 m-0 space-y-0">
          <DialogTitle className="font-bold text-[#1c1c1e] dark:text-white flex items-center">
            <GitCommit size={18} className="mr-2 text-blue-500" /> Vault History
          </DialogTitle>
          <DialogDescription className="sr-only">
            View Git history of this vault
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-2">
          {vaultHistory.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">
              No Git history found for this vault. Try saving some notes to
              create a commit.
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {vaultHistory.map((commit: any, index: number) => (
                <div key={commit.hash} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-[#252528] z-10"></div>
                    {index < vaultHistory.length - 1 && (
                      <div className="w-px h-full bg-gray-200 dark:bg-gray-700 -mt-1 group-hover:bg-blue-300 transition-colors"></div>
                    )}
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="bg-gray-50 dark:bg-[#1c1c1e] p-4 rounded-lg border border-border shadow-sm group-hover:border-blue-200 dark:group-hover:border-blue-900 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-[#1c1c1e] dark:text-gray-200">
                          {commit.message}
                        </span>
                        <span className="text-xs font-mono text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                          {commit.hash.substring(0, 7)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 flex gap-3">
                        <span>{commit.author_name}</span>
                        <span>&bull;</span>
                        <span>{new Date(commit.date).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
