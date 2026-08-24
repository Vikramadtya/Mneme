import { ipcClient } from "@/api/ipcClient";
import React from "react";
import {
  Maximize,
  Search,
  GitCommit,
  Sun,
  Moon,
  Minimize2,
} from "lucide-react";
import { useVault, useNotes, useUI } from "../application/context";
import { Tooltip } from "./Tooltip";
import { EditorTabs } from "./EditorTabs";

function usePrefersDark(): boolean {
  const [isDark, setIsDark] = React.useState<boolean>(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDark;
}

function ZenModeButton({ zenMode, setZenMode }: any) {
  return (
    <div title={zenMode ? "Exit Zen Mode" : "Enter Zen Mode"}>
      <button
        onClick={() => setZenMode(!zenMode)}
        className={`p-1.5 rounded-md transition-colors ${zenMode ? "bg-[#007aff]/10 text-[#007aff]" : "text-gray-400 hover:text-gray-600 dark:hover:text-white"}`}
        aria-label="Toggle Zen Mode"
      >
        {zenMode ? <Minimize2 size={20} /> : <Maximize size={20} />}
      </button>
    </div>
  );
}

export function TopBar() {
  const rootProject = useNotes((s) => s.rootProject);
  const activeProject = useNotes((s) => s.activeProject);
  const isRootProject = useNotes((s) => s.isRootProject);
  const vaultSettings = useVault((s) => s.vaultSettings);
  const setVaultSettings = useVault((s) => s.setVaultSettings);
  const activeTab = useUI((s) => s.activeTab);
  const projectViewMode = useUI((s) => s.projectViewMode);
  const setProjectViewMode = useUI((s) => s.setProjectViewMode);
  const setZenMode = useUI((s) => s.setZenMode);
  const zenMode = useUI((s) => s.zenMode);
  const setSearchOpen = useUI((s) => s.setSearchOpen);
  const setIsVaultHistoryOpen = useUI((s) => s.setIsVaultHistoryOpen);
  const setVaultHistory = useNotes((s) => s.setVaultHistory);
  const vaultPath = useVault((s) => s.vaultPath);

  const handleOpenVaultHistory = async () => {
    setIsVaultHistoryOpen(true);
    if (vaultPath) {
      const res = await ipcClient.git.getVaultHistory(vaultPath);
      if (res.success) {
        setVaultHistory(res.data || []);
      }
    }
  };
  const prefersDark = usePrefersDark();

  return (
    <div className="sticky top-0 z-10 flex flex-col bg-[#f5f5f7]/80 dark:bg-[#121212]/80 backdrop-blur-2xl border-b border-gray-200 dark:border-white/10 transition-colors duration-300">
      <EditorTabs />
      <header
        aria-label="Top navigation bar"
        className="px-10 pt-6 pb-6 flex justify-between items-end"
      >
        <div>
          <div className="flex items-center text-xs font-medium text-[#71717a] dark:text-gray-400 mb-1">
            {activeTab === "project" && rootProject && (
              <div
                className={`w-2 h-2 rounded-full ${rootProject.color} mr-2`}
              ></div>
            )}
            {activeTab === "project"
              ? rootProject?.name || "All Notes"
              : "Overview"}
          </div>
          <h1 className="text-3xl font-bold text-[#1c1c1e] dark:text-white tracking-tight">
            {activeTab === "today"
              ? "Today"
              : activeTab === "agenda"
                ? "On the Agenda"
                : activeTab === "graph"
                  ? "Knowledge Graph"
                  : activeTab === "analytics"
                    ? "Analytics"
                    : activeProject?.name || "Notes"}
          </h1>
        </div>

        {activeTab === "project" && isRootProject ? (
          <div className="flex items-center gap-4">
            <div className="flex bg-[#e4e4e7] dark:bg-card rounded-lg p-1 shadow-inner border border-gray-300 dark:border-gray-700">
              <Tooltip content="Table of Contents">
                <button
                  onClick={() => setProjectViewMode("toc")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${projectViewMode === "toc" ? "bg-white dark:bg-[#3f3f46] text-[#1c1c1e] dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                >
                  Table of Contents
                </button>
              </Tooltip>
              <Tooltip content="Linear Notes">
                <button
                  onClick={() => setProjectViewMode("linear")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${projectViewMode === "linear" ? "bg-white dark:bg-[#3f3f46] text-[#1c1c1e] dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                >
                  Linear Notes
                </button>
              </Tooltip>
            </div>
            <ZenModeButton zenMode={zenMode} setZenMode={setZenMode} />
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Tooltip content="Toggle Theme" side="bottom">
              <button
                onClick={() => {
                  const current = vaultSettings?.theme || "system";
                  const isDark =
                    current === "dark" || (current === "system" && prefersDark);
                  setVaultSettings((prev: any) => ({
                    ...prev,
                    theme: isDark ? "light" : "dark",
                  }));
                }}
                className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-all"
              >
                {vaultSettings?.theme === "dark" ||
                (vaultSettings?.theme === "system" && prefersDark) ? (
                  <Sun size={18} strokeWidth={1.5} />
                ) : (
                  <Moon size={18} strokeWidth={1.5} />
                )}
              </button>
            </Tooltip>

            <Tooltip content="Search (⌘K)" side="bottom">
              <button
                onClick={() => setSearchOpen(true)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
              >
                <Search size={18} />
              </button>
            </Tooltip>
            <Tooltip content="Vault Git History" side="bottom">
              <button
                onClick={handleOpenVaultHistory}
                className="text-gray-400 hover:text-blue-500 transition-colors"
              >
                <GitCommit size={18} />
              </button>
            </Tooltip>
            <ZenModeButton zenMode={zenMode} setZenMode={setZenMode} />
          </div>
        )}
      </header>
    </div>
  );
}
