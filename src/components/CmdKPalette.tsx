import React from "react";
import { Search } from "lucide-react";
import { Virtuoso } from "react-virtuoso";
import { useNotes, useUI } from "../application/context";

import { ipc } from "../ipc";
import { useDebounce } from "use-debounce";

export function CmdKPalette() {
  const allNotesFlat = useNotes((s) => s.allNotesFlat);
  const selectProject = useNotes((s) => s.selectProject);
  const searchOpen = useUI((s) => s.searchOpen);
  const setSearchOpen = useUI((s) => s.setSearchOpen);
  const searchQuery = useUI((s) => s.searchQuery);
  const setSearchQuery = useUI((s) => s.setSearchQuery);
  const setActiveTab = useUI((s) => s.setActiveTab);

  const [results, setResults] = React.useState<any[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  const [debouncedSearchQuery] = useDebounce(searchQuery, 150);

  React.useEffect(() => {
    if (!debouncedSearchQuery.trim()) {
      setResults([]);
      return;
    }

    const search = async () => {
      setIsSearching(true);
      try {
        const res = await ipc.invoke("db:searchNotes", debouncedSearchQuery);
        if (res.success && res.data) {
          setResults(res.data);
        } else {
          setResults([]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    };

    search();
  }, [debouncedSearchQuery]);

  if (!searchOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex justify-center items-start pt-20 backdrop-blur-sm"
      onClick={() => setSearchOpen(false)}
    >
      <div
        className="bg-card rounded-xl shadow-2xl w-[600px] max-w-full overflow-hidden border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center">
          <Search className="text-gray-400 mr-3" size={20} />
          <input
            autoFocus
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, chapters, and tags... (Cmd+K)"
            className="w-full bg-transparent border-none outline-none text-lg text-[#1c1c1e] dark:text-white"
          />
        </div>
        <div className="max-h-[400px] overflow-hidden flex flex-col">
          {!searchQuery.trim() ? (
            <div className="p-8 text-center text-gray-400">
              Type to search...
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No results found for "{searchQuery}"
            </div>
          ) : (
            <Virtuoso
              style={{ height: Math.min(400, results.length * 64) }}
              totalCount={results.length}
              itemContent={(index) => {
                const n: any = results[index];
                return (
                  <div className="border-b border-border h-[64px]">
                    <button
                      onClick={() => {
                        setSearchOpen(false);
                        if (n.chapterId) {
                          const parentProject = allNotesFlat.find(
                            (p: any) => p.id === n.chapterId,
                          );
                          if (parentProject) {
                            selectProject(parentProject.id);
                            setActiveTab("project");
                          }
                        } else {
                          selectProject(n.id);
                          setActiveTab("project");
                        }
                        setTimeout(() => {
                          const el = document.getElementById(`note-\${n.id}`);
                          if (el) {
                            el.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                            el.classList.add("ring-2", "ring-[#007aff]");
                            setTimeout(
                              () =>
                                el.classList.remove("ring-2", "ring-[#007aff]"),
                              2000,
                            );
                          }
                        }, 100);
                      }}
                      className="w-full h-full text-left px-4 hover:bg-[#f4f4f5] dark:hover:bg-[#333336] transition-colors border-l-2 border-transparent hover:border-[#007aff] flex flex-col justify-center gap-1"
                    >
                      <div className="font-medium text-[#1c1c1e] dark:text-white truncate">
                        {n.title}
                      </div>
                      <div
                        className="text-xs text-muted-foreground truncate"
                        dangerouslySetInnerHTML={{
                          __html: n.snippet || "No snippet available",
                        }}
                      />
                    </button>
                  </div>
                );
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
