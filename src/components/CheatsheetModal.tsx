import { X, Keyboard } from "lucide-react";
import { useUI } from "../application/context";

export function CheatsheetModal() {
  const cheatsheetOpen = useUI((s) => s.cheatsheetOpen);
  const setCheatsheetOpen = useUI((s) => s.setCheatsheetOpen);

  const shortcuts = [
    {
      category: "Global",
      items: [
        { keys: ["⌘", "K"], desc: "Open Command Palette" },
        { keys: ["⌘", "/"], desc: "Toggle this Keyboard Cheatsheet" },
        { keys: ["⌘", "P"], desc: "Print current Note" },
        { keys: ["Esc"], desc: "Close Modals / Exit Editing" },
      ],
    },
    {
      category: "Editor",
      items: [
        { keys: ["⌘", "S"], desc: "Save / Exit Edit Mode" },
        { keys: ["⌘", "B"], desc: "Bold Text" },
        { keys: ["⌘", "I"], desc: "Italic Text" },
        { keys: ["⌘", "U"], desc: "Underline Text" },
        { keys: ["[", "["], desc: "Autocomplete Note Link" },
      ],
    },
    {
      category: "Navigation",
      items: [
        { keys: ["⌘", "Z"], desc: "Toggle Zen Mode" },
        { keys: ["↑", "↓"], desc: "Navigate Lists" },
        { keys: ["Enter"], desc: "Select Item" },
      ],
    },
  ];

  return (
    <>
      {cheatsheetOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm animate-fadeIn"
          onClick={() => setCheatsheetOpen(false)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl w-[600px] max-w-[90vw] overflow-hidden border border-border animate-zoomIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-[#f9f9f9] dark:bg-card">
              <h2 className="text-lg font-bold text-[#1c1c1e] dark:text-white flex items-center">
                <Keyboard size={18} className="mr-2 text-indigo-500" /> Keyboard
                Shortcuts
              </h2>
              <button
                onClick={() => setCheatsheetOpen(false)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-gray-200 dark:hover:bg-[#333336]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid gap-8">
                {shortcuts.map((group, idx) => (
                  <div key={idx}>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-border pb-2">
                      {group.category}
                    </h3>
                    <div className="space-y-3">
                      {group.items.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between"
                        >
                          <span className="text-[15px] font-medium text-gray-700 dark:text-gray-300">
                            {item.desc}
                          </span>
                          <div className="flex gap-1.5">
                            {item.keys.map((k, j) => (
                              <kbd
                                key={j}
                                className="px-2.5 py-1 min-w-[28px] text-center bg-muted border border-border rounded-md text-sm font-mono font-semibold text-gray-700 dark:text-gray-300 shadow-sm"
                              >
                                {k}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-background text-center text-xs text-gray-500">
              Pro tip: Use the Command Palette (⌘ K) if you forget a shortcut!
            </div>
          </div>
        </div>
      )}
    </>
  );
}
