import React, { useState } from "react";
import {
  RefreshCw,
  Archive,
  Settings,
  Square,
  ExternalLink,
  Play,
} from "lucide-react";
import { useVault, useUI } from "../../application/context";
import { ipcClient } from "@/api/ipcClient";
import { Tooltip } from "../../components/Tooltip";

export function SidebarFooter() {
  const handleSync = useVault((s) => s.handleSync);
  const syncing = useVault((s) => s.syncing);
  const vaultPath = useVault((s) => s.vaultPath);

  const sidebarCollapsed = useUI((s) => s.sidebarCollapsed);
  const setSettingsOpen = useUI((s) => s.setSettingsOpen);
  const setSettingsTab = useUI((s) => s.setSettingsTab);
  const showToast = useUI((s) => s.showToast);

  const [isExporting, setIsExporting] = useState(false);

  const handleOpenSettings = () => {
    setSettingsTab("general");
    setSettingsOpen(true);
  };

  const handleExportZip = async () => {
    if (!vaultPath) return;
    setIsExporting(true);
    try {
      const res = await ipcClient.db.exportVaultZip(vaultPath);
      if (res.success && res.data) {
        showToast("Export successful to: " + res.data.filePath);
      } else if (res.error !== "Export canceled") {
        showToast("Export failed: " + res.error, "error");
      }
    } catch (e: any) {
      showToast("Error: " + e.message, "error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-3 border-t border-[#d4d4d8] dark:border-[#333336] mt-auto space-y-0.5">
      <Tooltip content="Sync Vault" side="right">
        <button
          onClick={handleSync}
          disabled={syncing}
          className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-0" : "gap-2.5 px-3"} py-2 text-[13px] font-medium text-[#71717a] dark:text-gray-400 hover:text-[#1c1c1e] dark:hover:text-white rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50`}
        >
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          {!sidebarCollapsed && (
            <span>{syncing ? "Syncing..." : "Sync Vault"}</span>
          )}
        </button>
      </Tooltip>
      <Tooltip content="Export as ZIP" side="right">
        <button
          onClick={handleExportZip}
          disabled={isExporting}
          className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-0" : "gap-2.5 px-3"} py-2 text-[13px] font-medium text-[#71717a] dark:text-gray-400 hover:text-[#1c1c1e] dark:hover:text-white rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50`}
        >
          <Archive size={14} className={isExporting ? "animate-bounce" : ""} />
          {!sidebarCollapsed && (
            <span>{isExporting ? "Exporting..." : "Export as ZIP"}</span>
          )}
        </button>
      </Tooltip>

      <Tooltip content="Settings" side="right">
        <button
          onClick={handleOpenSettings}
          className={`w-full flex items-center ${sidebarCollapsed ? "justify-center px-0" : "gap-2.5 px-3"} py-2 text-[13px] font-medium text-[#71717a] dark:text-gray-400 hover:text-[#1c1c1e] dark:hover:text-white rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors`}
        >
          <Settings size={14} />
          {!sidebarCollapsed && <span>Settings</span>}
        </button>
      </Tooltip>
    </div>
  );
}
