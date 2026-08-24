import React from "react";
import { useUI, useNotes } from "../application/context";
import { FileText, X } from "lucide-react";

export function EditorTabs() {
  const { openTabs, activeTabId, setActiveTabId, removeTab } = useUI();
  const allNotesFlat = useNotes((s: any) => s.allNotesFlat);
  const selectProject = useNotes((s: any) => s.selectProject);

  if (!openTabs || openTabs.length === 0) return null;

  return (
    <div className="flex items-center overflow-x-auto bg-background pt-2 hide-scrollbar px-2 flex-shrink-0">
      {openTabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => {
            setActiveTabId(tab.id);
            const note = allNotesFlat.find((n: any) => n.id === tab.id);
            if (note && note.project_id) {
              // We don't have the parent ID easily here, but selectProject(note.project_id) works
              selectProject(note.project_id);
            }
          }}
          className={`group flex items-center min-w-[150px] max-w-[220px] px-4 py-2 cursor-pointer select-none transition-colors border-t-2 border-l border-r ${activeTabId === tab.id ? "bg-[#f5f5f7] dark:bg-[#121212] text-[#1c1c1e] dark:text-white font-medium border-t-blue-500 border-l-gray-200 border-r-gray-200 dark:border-l-gray-800 dark:border-r-gray-800 shadow-sm z-10 rounded-t-lg -mb-[1px]" : "bg-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border-transparent border-t-transparent hover:bg-gray-50 dark:hover:bg-white/5 rounded-t-lg"}`}
        >
          <FileText size={14} className="mr-2 flex-shrink-0 opacity-70" />
          <span className="truncate text-sm mr-2 flex-1">{tab.title}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeTab(tab.id);
            }}
            className={`p-0.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 ${
              activeTabId === tab.id
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100"
            } transition-opacity`}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
