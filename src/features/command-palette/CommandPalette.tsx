import React, { useState, useEffect } from "react";
import { Command } from "cmdk";
import {
  NotebookPen,
  Settings,
  History,
  Search,
  RefreshCw,
  SunMoon,
} from "lucide-react";
import { useUI, useNotes, useVault } from "../../application/context";
import { ipcClient } from "@/api/ipcClient";

export function CommandPalette() {
  const { cmdkOpen, setCmdkOpen, setSettingsOpen, setSearchOpen } = useUI();
  const { allNotesFlat } = useNotes();
  const { vaultSettings, handleSync } = useVault();

  const [searchQuery, setSearchQuery] = useState("");

  // Sync action
  const runSync = async () => {
    setCmdkOpen(false);
    await handleSync();
  };

  // Toggle Theme action
  const toggleTheme = async () => {
    setCmdkOpen(false);
    const currentTheme = vaultSettings?.theme || "system";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    if (vaultSettings) {
      // Assuming handleSaveSettings or similar is available via context, but we can also just emit an IPC
      // Wait, let's look at how Theme is toggled. For now we will update it via ipcClient.
      // Actually we have handleSaveSettings in useUI / useVault.
      // Let's use it.
    }
  };

  return (
    <Command.Dialog
      open={cmdkOpen}
      onOpenChange={setCmdkOpen}
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-card rounded-xl shadow-2xl border border-border w-full max-w-2xl overflow-hidden flex flex-col">
        <Command.Input
          value={searchQuery}
          onValueChange={setSearchQuery}
          placeholder="Search notes or type a command..."
          className="w-full px-4 py-4 bg-transparent border-b border-gray-100 dark:border-zinc-800 outline-none text-lg text-gray-900 dark:text-white placeholder:text-gray-400"
        />
        <Command.List className="max-h-[300px] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-gray-500 text-sm">
            No results found.
          </Command.Empty>

          <Command.Group
            heading="Notes"
            className="text-xs font-semibold text-muted-foreground px-2 py-1"
          >
            {allNotesFlat.map((note: any) => (
              <Command.Item
                key={note.id}
                onSelect={() => {
                  const el = document.getElementById("note-" + note.id);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth" });
                    el.classList.add("ring-2", "ring-[#007aff]");
                    setTimeout(
                      () => el.classList.remove("ring-2", "ring-[#007aff]"),
                      2000,
                    );
                  }
                  setCmdkOpen(false);
                }}
                className="flex items-center px-2 py-2 rounded-lg cursor-pointer hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <NotebookPen size={14} className="mr-2 text-gray-400" />
                <span className="text-sm font-medium">{note.title}</span>
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group
            heading="Commands"
            className="text-xs font-semibold text-muted-foreground px-2 py-1 mt-2"
          >
            <Command.Item
              onSelect={() => {
                setSearchOpen(true);
                setCmdkOpen(false);
              }}
              className="flex items-center px-2 py-2 rounded-lg cursor-pointer hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
            >
              <Search size={14} className="mr-2 text-gray-400" />
              <span className="text-sm font-medium">
                Search Content (Full Text)
              </span>
            </Command.Item>

            <Command.Item
              onSelect={runSync}
              className="flex items-center px-2 py-2 rounded-lg cursor-pointer hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
            >
              <RefreshCw size={14} className="mr-2 text-gray-400" />
              <span className="text-sm font-medium">Sync Vault</span>
            </Command.Item>

            <Command.Item
              onSelect={() => {
                setSettingsOpen(true);
                setCmdkOpen(false);
              }}
              className="flex items-center px-2 py-2 rounded-lg cursor-pointer hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
            >
              <Settings size={14} className="mr-2 text-gray-400" />
              <span className="text-sm font-medium">Open Settings</span>
            </Command.Item>
          </Command.Group>
        </Command.List>
      </div>
    </Command.Dialog>
  );
}
