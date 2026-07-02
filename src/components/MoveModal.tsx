import React, { useState } from "react";
import { X, Folder, BookOpen, Layers } from "lucide-react";
import type { Project } from "../types";

interface MoveModalProps {
  itemType: "note" | "chapter" | "book" | "course";
  itemName: string;
  itemId: string;
  projects: Project[];
  onMove: (newParentId: string | null) => void;
  onClose: () => void;
}

export const MoveModal: React.FC<MoveModalProps> = ({
  itemType,
  itemName,
  itemId: _itemId,
  projects,
  onMove,
  onClose,
}) => {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  // Determine valid drop targets based on itemType
  const getValidTargets = () => {
    switch (itemType) {
      case "note":
        // Can be moved to a chapter, book, or course
        return projects.filter(
          (p) => !p.parent_id || (p as any).type === "chapter",
        );
      case "chapter":
        // Can only be moved to a book or course
        return projects.filter(
          (p) => (p as any).type === "book" || (p as any).type === "course",
        );
      case "book":
      case "course":
        // Can be moved to root (no parent) or maybe another book/course?
        // Currently UI treats books/courses as root only.
        return [];
      default:
        return [];
    }
  };

  const validTargets = getValidTargets();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl shadow-black/40 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <h2 className="text-lg font-medium text-zinc-100 flex items-center">
            <Folder size={18} className="mr-2 text-zinc-400" />
            Move {itemType}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm text-zinc-400 mb-4">
            Select a new destination for{" "}
            <strong className="text-zinc-200">{itemName}</strong>:
          </p>

          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-1 custom-scrollbar">
            {itemType === "book" || itemType === "course" ? (
              <div className="text-center py-8 text-zinc-500 text-sm">
                Root items cannot be moved.
              </div>
            ) : validTargets.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm">
                No valid destinations found.
              </div>
            ) : (
              validTargets.map((target) => (
                <button
                  key={target.id}
                  onClick={() => setSelectedParentId(target.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl flex flex-col transition-all duration-200 ${
                    selectedParentId === target.id
                      ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-400"
                      : "bg-zinc-800/30 border-transparent text-zinc-300 hover:bg-zinc-800"
                  } border`}
                >
                  <div className="flex items-center text-sm font-medium">
                    {(target as any).type === "chapter" ? (
                      <Layers size={14} className="mr-2 opacity-70" />
                    ) : (
                      <BookOpen size={14} className="mr-2 opacity-70" />
                    )}
                    {target.name}
                  </div>
                  {(target as any).type === "chapter" && target.parent_id && (
                    <div className="text-xs text-zinc-500 mt-1 pl-6">
                      in{" "}
                      {projects.find((p) => p.id === target.parent_id)?.name ||
                        "Unknown"}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onMove(selectedParentId)}
            disabled={!selectedParentId}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-500/20"
          >
            Move Here
          </button>
        </div>
      </div>
    </div>
  );
};
