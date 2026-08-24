import React from "react";
import { Search, Circle, Calendar, Network, BarChart } from "lucide-react";
import { useUI, useNotes, useReview } from "../../application/context";

export function SidebarSearch({
  sidebarSearch,
  setSidebarSearch,
}: {
  sidebarSearch: string;
  setSidebarSearch: (v: string) => void;
}) {
  const sidebarCollapsed = useUI((s) => s.sidebarCollapsed);

  if (sidebarCollapsed) return null;

  return (
    <div className="px-4 mb-4 mt-2">
      <div className="flex items-center bg-white dark:bg-background rounded-xl px-3 py-1.5 border border-border shadow-sm focus-within:border-mac-accent focus-within:ring-2 focus-within:ring-mac-accent/20 transition-all">
        <Search size={14} className="text-gray-400 mr-2" />
        <input
          type="text"
          placeholder="Search projects..."
          value={sidebarSearch}
          onChange={(e) => setSidebarSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm w-full text-foreground placeholder-gray-400"
        />
      </div>
    </div>
  );
}

export function SidebarNavLinks() {
  const sidebarCollapsed = useUI((s) => s.sidebarCollapsed);
  const activeTab = useUI((s) => s.activeTab);
  const setActiveTab = useUI((s) => s.setActiveTab);
  const setActiveProjectId = useNotes((s) => s.setActiveProjectId);
  const setReviewMode = useReview((s) => s.setReviewMode);

  return (
    <div className="mb-6">
      <ul className="space-y-0.5">
        <li>
          <button
            onClick={() => {
              setActiveTab("agenda");
              setReviewMode(false);
            }}
            className={`w-full flex items-center ${
              sidebarCollapsed ? "justify-center px-0" : "px-3"
            } py-1.5 text-[13px] font-medium rounded-xl transition-colors ${
              activeTab === "agenda"
                ? "bg-accent text-accent-foreground shadow-sm"
                : "hover:bg-accent hover:text-accent-foreground text-foreground"
            }`}
          >
            <Circle
              size={12}
              className={`${!sidebarCollapsed ? "mr-2" : ""} ${
                activeTab === "agenda"
                  ? "fill-white"
                  : "fill-[#eab308] text-[#eab308]"
              }`}
            />
            {!sidebarCollapsed && (
              <span className="truncate ml-2">On the Agenda</span>
            )}
          </button>
        </li>
        <li>
          <button
            onClick={() => {
              setActiveTab("today");
              setReviewMode(false);
            }}
            className={`w-full flex items-center ${
              sidebarCollapsed ? "justify-center px-0" : "px-3"
            } py-1.5 text-[13px] font-medium rounded-xl transition-colors ${
              activeTab === "today"
                ? "bg-accent text-accent-foreground shadow-sm"
                : "hover:bg-accent hover:text-accent-foreground text-foreground"
            }`}
          >
            <Calendar
              size={14}
              className={`${!sidebarCollapsed ? "mr-2" : ""} opacity-80`}
            />{" "}
            {!sidebarCollapsed && " Today"}
          </button>
        </li>
        <li>
          <button
            onClick={() => {
              setActiveTab("graph");
              setReviewMode(false);
            }}
            className={`w-full flex items-center ${
              sidebarCollapsed ? "justify-center px-0" : "px-3"
            } py-1.5 text-[13px] font-medium rounded-xl transition-colors ${
              activeTab === "graph"
                ? "bg-accent text-accent-foreground shadow-sm"
                : "hover:bg-accent hover:text-accent-foreground text-foreground"
            }`}
          >
            <Network size={14} className={!sidebarCollapsed ? "mr-2" : ""} />
            {!sidebarCollapsed && "Knowledge Graph"}
          </button>
        </li>
        <li>
          <button
            onClick={() => {
              setActiveTab("analytics");
              setActiveProjectId(null);
              setReviewMode(false);
            }}
            className={`w-full flex items-center ${
              sidebarCollapsed ? "justify-center px-0" : "px-3"
            } py-1.5 text-[13px] font-medium rounded-xl transition-colors ${
              activeTab === "analytics"
                ? "bg-indigo-500 text-white"
                : "hover:bg-accent hover:text-accent-foreground text-foreground"
            }`}
          >
            <BarChart
              size={14}
              className={`${!sidebarCollapsed ? "mr-2" : ""}`}
            />
            {!sidebarCollapsed && "Analytics"}
          </button>
        </li>
      </ul>
    </div>
  );
}
