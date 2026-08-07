import { ipcClient } from "@/api/ipcClient";
import React, { useState } from "react";
import { X, Settings } from "lucide-react";

import { useVault, useUI } from "../application/context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";

export function SettingsModal() {
  const isSavingConfig = useVault((s) => s.isSavingConfig);
  const vaultSettings = useVault((s) => s.vaultSettings);
  const setVaultSettings = useVault((s) => s.setVaultSettings);
  const mkdocsConfig = useVault((s) => s.mkdocsConfig);
  const setMkdocsConfig = useVault((s) => s.setMkdocsConfig);
  const vaultPath = useVault((s) => s.vaultPath);
  const handleSelectVault = useVault((s) => s.handleSelectVault);
  const settingsOpen = useUI((s) => s.settingsOpen);
  const setSettingsOpen = useUI((s) => s.setSettingsOpen);
  const settingsTab = useUI((s) => s.settingsTab);
  const setSettingsTab = useUI((s) => s.setSettingsTab);
  const handleSaveSettings = useUI((s) => s.handleSaveSettings);
  const showToast = useUI((s) => s.showToast);

  const [isSquashing, setIsSquashing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hardwareStatus, setHardwareStatus] = useState<any>(null);
  const [isCheckingHardware, setIsCheckingHardware] = useState(false);
  const [modelsState, setModelsState] = useState<
    import("../ai/types").AIModelState[]
  >([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelLoadingState, setModelLoadingState] = useState<{
    [id: string]: { action: string; progress?: number };
  }>({});

  const refreshModelsState = async () => {
    try {
      const { aiClient } = await import("../ai/client");
      const state = await aiClient.getModelsState();
      setModelsState(state);
    } catch (e) {
      console.warn("Failed to get models state", e);
    }
  };

  const [openAiModelsList, setOpenAiModelsList] = useState<string[]>([]);
  const [isFetchingOpenAiModels, setIsFetchingOpenAiModels] = useState(false);

  const handleFetchOpenAiModels = async () => {
    if (!vaultSettings.openAiKey) {
      showToast("Please enter an OpenAI API Key first", "error");
      return;
    }
    setIsFetchingOpenAiModels(true);
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${vaultSettings.openAiKey}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || res.statusText);
      }
      const data = await res.json();
      const models = data.data
        .filter((m: any) => m.id.startsWith("gpt-") || m.id.startsWith("o1-"))
        .map((m: any) => m.id)
        .sort();
      setOpenAiModelsList(models);
      showToast(`Fetched ${models.length} models`, "success");
    } catch (e: any) {
      showToast("Failed to fetch models: " + e.message, "error");
    } finally {
      setIsFetchingOpenAiModels(false);
    }
  };

  const [geminiModelsList, setGeminiModelsList] = useState<string[]>([]);
  const [isFetchingGeminiModels, setIsFetchingGeminiModels] = useState(false);

  const handleFetchGeminiModels = async () => {
    if (!vaultSettings.geminiKey) {
      showToast("Please enter a Google Gemini API Key first", "error");
      return;
    }
    setIsFetchingGeminiModels(true);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${vaultSettings.geminiKey}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || res.statusText);
      }
      const data = await res.json();
      const models = data.models
        .map((m: any) => m.name.replace("models/", ""))
        .filter((name: string) => name.startsWith("gemini-"))
        .sort();
      setGeminiModelsList(models);
      showToast(`Fetched ${models.length} models`, "success");
    } catch (e: any) {
      showToast("Failed to fetch models: " + e.message, "error");
    } finally {
      setIsFetchingGeminiModels(false);
    }
  };

  const handleDownloadModel = async (model: string) => {
    setModelLoadingState((prev) => ({
      ...prev,
      [model]: { action: "downloading", progress: 0 },
    }));
    try {
      const { aiClient } = await import("../ai/client");
      await aiClient.loadModel(model, (progress, status) => {
        setModelLoadingState((prev) => ({
          ...prev,
          [model]: { action: "downloading", progress },
        }));
      });
      showToast(
        `Model ${model.split("/").pop()} downloaded successfully`,
        "success",
      );
      refreshModelsState();
    } catch (e: any) {
      showToast(`Failed to download ${model}: ` + e.message, "error");
    } finally {
      setModelLoadingState((prev) => {
        const next = { ...prev };
        delete next[model];
        return next;
      });
    }
  };

  const handleUnloadModel = async (model: string) => {
    setModelLoadingState((prev) => ({
      ...prev,
      [model]: { action: "unloading" },
    }));
    try {
      const { aiClient } = await import("../ai/client");
      await aiClient.unloadModels(model);
      showToast(
        `Model ${model.split("/").pop()} unloaded from memory`,
        "success",
      );
      refreshModelsState();
    } catch (e: any) {
      showToast(`Failed to unload ${model}: ` + e.message, "error");
    } finally {
      setModelLoadingState((prev) => {
        const next = { ...prev };
        delete next[model];
        return next;
      });
    }
  };

  const handleDeleteModel = async (model: string) => {
    setModelLoadingState((prev) => ({
      ...prev,
      [model]: { action: "deleting" },
    }));
    try {
      const { aiClient } = await import("../ai/client");
      await aiClient.deleteModel(model);
      showToast(
        `Model ${model.split("/").pop()} deleted from cache`,
        "success",
      );
      refreshModelsState();
    } catch (e: any) {
      showToast(`Failed to delete ${model}: ` + e.message, "error");
    } finally {
      setModelLoadingState((prev) => {
        const next = { ...prev };
        delete next[model];
        return next;
      });
    }
  };

  const handleExportZip = async () => {
    if (!vaultPath) return;
    setIsExporting(true);
    try {
      const res = await ipcClient.db.exportVaultZip(vaultPath);
      if (res.success) {
        showToast("Export successful to: " + res.data.filePath);
      } else if (res.error !== "Export canceled") {
        showToast("Export failed: " + res.error, "error");
      }
    } catch (e: any) {
      showToast("Error exporting: " + e.message, "error");
    } finally {
      setIsExporting(false);
    }
  };

  // Check hardware when opening the AI tab
  React.useEffect(() => {
    if (settingsTab === "ai") {
      // Migrate old settings
      if (
        vaultSettings.aiSummaryModel === "Xenova/Qwen2.5-0.5B-Instruct" ||
        vaultSettings.aiTagModel === "Xenova/Qwen2.5-0.5B-Instruct" ||
        vaultSettings.aiSummaryModel === "Xenova/SmolLM-135M-Instruct" ||
        vaultSettings.aiTagModel === "Xenova/SmolLM-135M-Instruct"
      ) {
        setVaultSettings((prev: any) => ({
          ...prev,
          aiSummaryModel:
            prev.aiSummaryModel === "Xenova/Qwen2.5-0.5B-Instruct"
              ? "onnx-community/Qwen2.5-0.5B-Instruct"
              : prev.aiSummaryModel === "Xenova/SmolLM-135M-Instruct"
                ? "onnx-community/SmolLM2-135M-Instruct-ONNX"
                : prev.aiSummaryModel,
          aiTagModel:
            prev.aiTagModel === "Xenova/Qwen2.5-0.5B-Instruct"
              ? "onnx-community/Qwen2.5-0.5B-Instruct"
              : prev.aiTagModel === "Xenova/SmolLM-135M-Instruct"
                ? "onnx-community/SmolLM2-135M-Instruct-ONNX"
                : prev.aiTagModel,
        }));
      }

      setIsCheckingHardware(true);
      setIsFetchingModels(true);
      import("../ai/client").then(({ aiClient }) => {
        aiClient.checkHardware().then((status) => {
          setHardwareStatus(status);
          setIsCheckingHardware(false);
        });
        refreshModelsState().finally(() => setIsFetchingModels(false));
      });
    }
  }, [settingsTab]);

  const handleSquashHistory = async () => {
    if (!vaultPath) return;
    const confirmed = window.confirm(
      "Are you sure you want to squash your Git history? This will permanently collapse all past commits into a single initial commit and force-push to your remote repository. This action is destructive and cannot be undone.",
    );
    if (!confirmed) return;

    setIsSquashing(true);
    try {
      const res = await ipcClient.git.squashHistory(vaultPath);
      if (res.success) {
        showToast("Git history squashed successfully!", "success");
      } else {
        showToast("Squash failed: " + res.error, "error");
      }
    } catch (e: any) {
      showToast("Squash failed: " + e.message, "error");
    } finally {
      setIsSquashing(false);
    }
  };

  if (!vaultSettings) return null;

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="max-w-6xl sm:max-w-6xl w-full md:w-[95vw] lg:w-[90vw] h-[88vh] p-0 flex flex-col overflow-hidden gap-0 bg-card rounded-2xl border-border sm:rounded-2xl">
        <DialogHeader className="px-6 py-4 border-b border-border bg-white/80 dark:bg-card/80 backdrop-blur-md m-0">
          <DialogTitle className="flex items-center text-lg font-bold text-[#1c1c1e] dark:text-white">
            <Settings size={18} className="mr-2.5 text-[#007aff]" /> Vault
            Settings
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configure your vault settings
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Navigation */}
          <div className="w-48 border-r border-border bg-[#f9f9f9] dark:bg-[#1a1a1c] p-3 flex flex-col gap-1">
            {[
              { id: "general", label: "General", icon: "⚙️" },
              { id: "git", label: "Git & Sync", icon: "🔄" },
              { id: "mkdocs", label: "MkDocs Site", icon: "📖" },
              { id: "ai", label: "AI Assist", icon: "✨" },
              { id: "appearance", label: "Appearance", icon: "🎨" },
              { id: "data", label: "Data & Export", icon: "📦" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSettingsTab(tab.id as any)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left
                      ${
                        settingsTab === tab.id
                          ? "bg-[#007aff] text-white shadow-sm"
                          : "text-muted-foreground hover:bg-white dark:hover:bg-[#252528]"
                      }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* ══ GENERAL TAB ══════════════════════════════ */}
            {settingsTab === "general" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-[#1c1c1e] dark:text-white mb-1">
                    Vault Location
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    The root folder where all your notes, images, and Git
                    repository are stored.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={vaultPath || "No vault selected"}
                      readOnly
                      className="flex-1 bg-[#f4f4f5] dark:bg-card border border-border rounded-lg p-2.5 text-sm text-[#3f3f46] dark:text-gray-300 outline-none font-mono"
                    />
                    <button
                      onClick={async () => {
                        setSettingsOpen(false);
                        await handleSelectVault();
                        setSettingsOpen(true);
                      }}
                      className="bg-[#007aff] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm whitespace-nowrap"
                    >
                      Change Vault
                    </button>
                  </div>
                </div>

                <hr className="border-border" />

                <div>
                  <h3 className="text-base font-bold text-[#1c1c1e] dark:text-white mb-4">
                    MkDocs Live Preview
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                        MkDocs Site Name
                      </label>
                      <input
                        type="text"
                        value={vaultSettings.mkdocsSiteName || ""}
                        onChange={(e) =>
                          setVaultSettings((prev: any) => ({
                            ...prev,
                            mkdocsSiteName: e.target.value,
                          }))
                        }
                        className="w-full bg-[#f4f4f5] dark:bg-card border border-border rounded-lg p-2.5 text-sm text-[#1c1c1e] dark:text-white outline-none focus:ring-2 focus:ring-[#007aff]/30 focus:border-[#007aff]"
                        placeholder="My Knowledge Vault"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        The title of your published website.
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Server Port
                      </label>
                      <input
                        type="number"
                        min="1024"
                        max="65535"
                        value={vaultSettings.mkdocsPort || "8000"}
                        onChange={(e) =>
                          setVaultSettings((prev: any) => ({
                            ...prev,
                            mkdocsPort: e.target.value,
                          }))
                        }
                        className="w-full bg-[#f4f4f5] dark:bg-card border border-border rounded-lg p-2.5 text-sm text-[#1c1c1e] dark:text-white outline-none focus:ring-2 focus:ring-[#007aff]/30 focus:border-[#007aff]"
                        placeholder="8000"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Access at http://127.0.0.1:
                        <strong>{vaultSettings.mkdocsPort || "8000"}</strong>
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                        MkDocs Command
                      </label>
                      <input
                        type="text"
                        value={
                          vaultSettings.mkdocsCommand || "python3 -m mkdocs"
                        }
                        onChange={(e) =>
                          setVaultSettings((prev: any) => ({
                            ...prev,
                            mkdocsCommand: e.target.value,
                          }))
                        }
                        className="w-full bg-[#f4f4f5] dark:bg-card border border-border rounded-lg p-2.5 text-sm text-[#1c1c1e] dark:text-white outline-none focus:ring-2 focus:ring-[#007aff]/30 font-mono"
                        placeholder="python3 -m mkdocs"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        How to invoke mkdocs on this system
                      </p>
                    </div>
                  </div>
                </div>

                <hr className="border-border" />

                <div>
                  <h3 className="text-base font-bold text-[#1c1c1e] dark:text-white mb-4">
                    Editor Preferences
                  </h3>
                  <div className="flex items-center justify-between bg-[#f4f4f5] dark:bg-card border border-border rounded-lg p-4">
                    <div>
                      <p className="text-sm font-semibold text-[#1c1c1e] dark:text-white">
                        Auto Format on Save
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Automatically clean up Markdown spacing and formatting
                        when saving notes.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={vaultSettings.autoFormatOnSave === "true"}
                        onChange={(e) =>
                          setVaultSettings((prev: any) => ({
                            ...prev,
                            autoFormatOnSave: e.target.checked
                              ? "true"
                              : "false",
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#007aff]"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ══ GIT & SYNC TAB ═══════════════════════════ */}
            {settingsTab === "git" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-[#1c1c1e] dark:text-white mb-1">
                    Remote Repository
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Connect your vault to a GitHub/GitLab repository for remote
                    backup and GitHub Pages publishing.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Remote URL
                      </label>
                      <input
                        type="text"
                        value={vaultSettings.gitRemoteUrl || ""}
                        onChange={(e) =>
                          setVaultSettings((prev: any) => ({
                            ...prev,
                            gitRemoteUrl: e.target.value,
                          }))
                        }
                        className="w-full bg-[#f4f4f5] dark:bg-card border border-border rounded-lg p-2.5 text-sm text-[#1c1c1e] dark:text-white outline-none focus:ring-2 focus:ring-[#007aff]/30 font-mono"
                        placeholder="https://github.com/yourname/your-vault.git"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Supports HTTPS and SSH URLs
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Default Branch
                      </label>
                      <input
                        type="text"
                        value={vaultSettings.gitBranch || "main"}
                        onChange={(e) =>
                          setVaultSettings((prev: any) => ({
                            ...prev,
                            gitBranch: e.target.value,
                          }))
                        }
                        className="w-full bg-[#f4f4f5] dark:bg-card border border-border rounded-lg p-2.5 text-sm text-[#1c1c1e] dark:text-white outline-none focus:ring-2 focus:ring-[#007aff]/30 font-mono"
                        placeholder="main"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                        GitHub Personal Access Token
                        <span className="ml-2 text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded">
                          Required for HTTPS push
                        </span>
                      </label>
                      <input
                        type="password"
                        value={vaultSettings.githubToken || ""}
                        onChange={(e) =>
                          setVaultSettings((prev: any) => ({
                            ...prev,
                            githubToken: e.target.value,
                          }))
                        }
                        className="w-full bg-[#f4f4f5] dark:bg-card border border-border rounded-lg p-2.5 text-sm text-[#1c1c1e] dark:text-white outline-none focus:ring-2 focus:ring-[#007aff]/30 font-mono"
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Create one at{" "}
                        <span className="text-[#007aff]">
                          github.com → Settings → Developer Settings → Personal
                          Access Tokens
                        </span>
                        . Needs <code>repo</code> scope. Leave empty if using
                        SSH.
                      </p>
                    </div>
                  </div>
                </div>

                <hr className="border-border" />

                <div>
                  <h3 className="text-base font-bold text-[#1c1c1e] dark:text-white mb-1">
                    GitHub Pages Deployment
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Automatically deploy your MkDocs site to GitHub Pages on
                    every sync. Requires a connected remote URL above.
                  </p>

                  <div className="flex items-center justify-between p-4 bg-[#f4f4f5] dark:bg-card rounded-xl border border-border">
                    <div>
                      <p className="text-sm font-semibold text-[#1c1c1e] dark:text-white">
                        Enable GitHub Actions Deploy
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Generates <code>.github/workflows/mkdocs.yml</code> in
                        your vault
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setVaultSettings((prev: any) => ({
                          ...prev,
                          githubActions: !prev.githubActions,
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${vaultSettings.githubActions ? "bg-[#007aff]" : "bg-gray-300 dark:bg-gray-600"}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${vaultSettings.githubActions ? "translate-x-6" : "translate-x-1"}`}
                      />
                    </button>
                  </div>

                  {vaultSettings.githubActions && (
                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-xs text-green-700 dark:text-green-400">
                      ✓ A <code>deploy.yml</code> workflow will be generated in
                      your vault. Push to{" "}
                      <strong>{vaultSettings.gitBranch || "main"}</strong> to
                      trigger deployment to GitHub Pages.
                    </div>
                  )}
                </div>

                <hr className="border-border" />

                <div>
                  <h3 className="text-base font-bold text-[#1c1c1e] dark:text-white mb-4">
                    Author Info
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Git Author Name
                      </label>
                      <input
                        type="text"
                        value={vaultSettings.gitAuthorName || ""}
                        onChange={(e) =>
                          setVaultSettings((prev: any) => ({
                            ...prev,
                            gitAuthorName: e.target.value,
                          }))
                        }
                        className="w-full bg-[#f4f4f5] dark:bg-card border border-border rounded-lg p-2.5 text-sm text-[#1c1c1e] dark:text-white outline-none focus:ring-2 focus:ring-[#007aff]/30"
                        placeholder="Your Name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Git Author Email
                      </label>
                      <input
                        type="email"
                        value={vaultSettings.gitAuthorEmail || ""}
                        onChange={(e) =>
                          setVaultSettings((prev: any) => ({
                            ...prev,
                            gitAuthorEmail: e.target.value,
                          }))
                        }
                        className="w-full bg-[#f4f4f5] dark:bg-card border border-border rounded-lg p-2.5 text-sm text-[#1c1c1e] dark:text-white outline-none focus:ring-2 focus:ring-[#007aff]/30"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-border" />

                <div>
                  <h3 className="text-base font-bold text-red-500 mb-1">
                    Danger Zone
                  </h3>
                  <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg p-4">
                    <div>
                      <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                        Squash Git History
                      </p>
                      <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
                        Compact all past commits into a single "Initial commit"
                        to clean up messy history.
                      </p>
                    </div>
                    <button
                      onClick={handleSquashHistory}
                      disabled={isSquashing}
                      className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                    >
                      {isSquashing ? "Squashing..." : "Squash History"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ══ MKDOCS SITE TAB ═══════════════════════════ */}
            {settingsTab === "mkdocs" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-[#1c1c1e] dark:text-white mb-1">
                    Site Information
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Configure your MkDocs site metadata. These fields update
                    your <code>mkdocs.yml</code>.
                  </p>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                          Site Name
                        </label>
                        <input
                          type="text"
                          value={vaultSettings.mkdocsSiteName || ""}
                          onChange={(e) =>
                            setVaultSettings((prev: any) => ({
                              ...prev,
                              mkdocsSiteName: e.target.value,
                            }))
                          }
                          className="w-full bg-[#f4f4f5] dark:bg-card border border-border rounded-lg p-2.5 text-sm text-[#1c1c1e] dark:text-white outline-none focus:ring-2 focus:ring-[#007aff]/30"
                          placeholder="My Knowledge Vault"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                          Author Name
                        </label>
                        <input
                          type="text"
                          value={vaultSettings.mkdocsAuthor || ""}
                          onChange={(e) =>
                            setVaultSettings((prev: any) => ({
                              ...prev,
                              mkdocsAuthor: e.target.value,
                            }))
                          }
                          className="w-full bg-[#f4f4f5] dark:bg-card border border-border rounded-lg p-2.5 text-sm text-[#1c1c1e] dark:text-white outline-none focus:ring-2 focus:ring-[#007aff]/30"
                          placeholder="Your Name"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Site Description
                      </label>
                      <input
                        type="text"
                        value={vaultSettings.mkdocsDescription || ""}
                        onChange={(e) =>
                          setVaultSettings((prev: any) => ({
                            ...prev,
                            mkdocsDescription: e.target.value,
                          }))
                        }
                        className="w-full bg-[#f4f4f5] dark:bg-card border border-border rounded-lg p-2.5 text-sm text-[#1c1c1e] dark:text-white outline-none focus:ring-2 focus:ring-[#007aff]/30"
                        placeholder="A powerful knowledge base"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Site URL (for GitHub Pages)
                      </label>
                      <input
                        type="url"
                        value={vaultSettings.mkdocsSiteUrl || ""}
                        onChange={(e) =>
                          setVaultSettings((prev: any) => ({
                            ...prev,
                            mkdocsSiteUrl: e.target.value,
                          }))
                        }
                        className="w-full bg-[#f4f4f5] dark:bg-card border border-border rounded-lg p-2.5 text-sm text-[#1c1c1e] dark:text-white outline-none focus:ring-2 focus:ring-[#007aff]/30 font-mono"
                        placeholder="https://yourname.github.io/your-vault"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-border" />

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-base font-bold text-[#1c1c1e] dark:text-white">
                      Raw mkdocs.yml Editor
                    </h3>
                    <span className="text-xs text-gray-400">Advanced</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Direct YAML editor for full control over all MkDocs
                    settings.
                  </p>
                  <textarea
                    value={mkdocsConfig}
                    onChange={(e) => setMkdocsConfig(e.target.value)}
                    className="w-full h-64 bg-[#f4f4f5] dark:bg-[#1a1a1c] border border-border rounded-lg p-4 text-xs font-mono text-[#3f3f46] dark:text-gray-300 outline-none resize-none leading-relaxed focus:ring-2 focus:ring-[#007aff]/30"
                    spellCheck={false}
                  />
                </div>
              </div>
            )}

            {/* ══ AI ASSIST TAB ═══════════════════════════ */}
            {settingsTab === "ai" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-[#1c1c1e] dark:text-white mb-1">
                    AI Assistant
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Configure artificial intelligence features for your vault.
                  </p>

                  <div className="flex items-center justify-between p-4 bg-[#f4f4f5] dark:bg-card rounded-xl border border-border">
                    <div>
                      <p className="text-sm font-semibold text-[#1c1c1e] dark:text-white">
                        Enable AI Features
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Turns on auto-summarization and tagging in the editor.
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setVaultSettings((prev: any) => ({
                          ...prev,
                          aiEnabled:
                            prev.aiEnabled === "true" ? "false" : "true",
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${vaultSettings.aiEnabled === "true" ? "bg-[#007aff]" : "bg-gray-300 dark:bg-gray-600"}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${vaultSettings.aiEnabled === "true" ? "translate-x-6" : "translate-x-1"}`}
                      />
                    </button>
                  </div>

                  {vaultSettings.aiEnabled === "true" && (
                    <div className="flex items-center justify-between p-4 bg-[#f4f4f5] dark:bg-card rounded-xl border border-border mt-4">
                      <div>
                        <p className="text-sm font-semibold text-[#1c1c1e] dark:text-white">
                          AI Backend Type
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Choose between processing entirely on your local
                          device (free, private) or using powerful Cloud APIs.
                        </p>
                      </div>
                      <select
                        value={vaultSettings.llmType || "local"}
                        onChange={(e) => {
                          const newType = e.target.value as "local" | "cloud";
                          setVaultSettings((prev: any) => ({
                            ...prev,
                            llmType: newType,
                            aiSummaryModel:
                              newType === "local"
                                ? "onnx-community/SmolLM2-135M-Instruct-ONNX"
                                : "remote:gpt-4o-mini",
                            aiTagModel:
                              newType === "local"
                                ? "onnx-community/SmolLM2-135M-Instruct-ONNX"
                                : "remote:gpt-4o-mini",
                          }));
                          if (newType === "cloud") {
                            import("../ai/client").then(({ aiClient }) => {
                              aiClient.deleteModel();
                            });
                          }
                        }}
                        className="px-3 py-1.5 bg-white dark:bg-[#252528] border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#007aff]"
                      >
                        <option value="local">Local Model</option>
                        <option value="cloud">Cloud APIs</option>
                      </select>
                    </div>
                  )}
                </div>

                {vaultSettings.aiEnabled === "true" && (
                  <>
                    <hr className="border-border" />
                    <div>
                      <h3 className="text-base font-bold text-[#1c1c1e] dark:text-white mb-1">
                        Model Configuration
                      </h3>
                      <div className="p-4 bg-gray-50 dark:bg-[#1a1a1c] border border-border rounded-xl space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-[#1c1c1e] dark:text-white mb-1">
                            Summarization Model
                          </label>
                          <select
                            value={
                              vaultSettings.aiSummaryModel ||
                              "onnx-community/SmolLM2-135M-Instruct-ONNX"
                            }
                            onChange={(e) =>
                              setVaultSettings((prev: any) => ({
                                ...prev,
                                aiSummaryModel: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 bg-white dark:bg-[#252528] border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#007aff]"
                          >
                            {!vaultSettings.llmType ||
                            vaultSettings.llmType === "local" ? (
                              <option value="onnx-community/SmolLM2-135M-Instruct-ONNX">
                                Local - SmolLM2-135M-Instruct-ONNX (135M Params,
                                Extremely Fast)
                              </option>
                            ) : (
                              <>
                                {openAiModelsList.length > 0 ? (
                                  openAiModelsList.map((m) => (
                                    <option key={m} value={`remote:${m}`}>
                                      Remote - OpenAI ({m})
                                    </option>
                                  ))
                                ) : (
                                  <option value="remote:gpt-4o-mini">
                                    Remote - OpenAI (gpt-4o-mini)
                                  </option>
                                )}
                                <option value="remote:claude-3-5-sonnet-20241022">
                                  Remote - Anthropic (claude-3.5-sonnet)
                                </option>
                                {geminiModelsList.length > 0 ? (
                                  geminiModelsList.map((m) => (
                                    <option key={m} value={`remote:${m}`}>
                                      Remote - Google ({m})
                                    </option>
                                  ))
                                ) : (
                                  <option value="remote:gemini-1.5-flash">
                                    Remote - Google (gemini-1.5-flash)
                                  </option>
                                )}
                              </>
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-[#1c1c1e] dark:text-white mb-1">
                            Tag Generation Model
                          </label>
                          <select
                            value={
                              vaultSettings.aiTagModel ||
                              "onnx-community/SmolLM2-135M-Instruct-ONNX"
                            }
                            onChange={(e) =>
                              setVaultSettings((prev: any) => ({
                                ...prev,
                                aiTagModel: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 bg-white dark:bg-[#252528] border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#007aff]"
                          >
                            {!vaultSettings.llmType ||
                            vaultSettings.llmType === "local" ? (
                              <option value="onnx-community/SmolLM2-135M-Instruct-ONNX">
                                Local - SmolLM2-135M-Instruct-ONNX (135M Params,
                                Extremely Fast)
                              </option>
                            ) : (
                              <>
                                {openAiModelsList.length > 0 ? (
                                  openAiModelsList.map((m) => (
                                    <option key={m} value={`remote:${m}`}>
                                      Remote - OpenAI ({m})
                                    </option>
                                  ))
                                ) : (
                                  <option value="remote:gpt-4o-mini">
                                    Remote - OpenAI (gpt-4o-mini)
                                  </option>
                                )}
                                <option value="remote:claude-3-5-sonnet-20241022">
                                  Remote - Anthropic (claude-3.5-sonnet)
                                </option>
                                {geminiModelsList.length > 0 ? (
                                  geminiModelsList.map((m) => (
                                    <option key={m} value={`remote:${m}`}>
                                      Remote - Google ({m})
                                    </option>
                                  ))
                                ) : (
                                  <option value="remote:gemini-1.5-flash">
                                    Remote - Google (gemini-1.5-flash)
                                  </option>
                                )}
                              </>
                            )}
                          </select>
                        </div>
                      </div>
                    </div>
                    {vaultSettings.llmType === "cloud" && (
                      <>
                        <hr className="border-border" />
                        <div>
                          <h3 className="text-base font-bold text-[#1c1c1e] dark:text-white mb-2">
                            Remote API Keys
                          </h3>
                          <p className="text-sm text-gray-500 mb-4">
                            Provide your API keys to use remote AI models. Keys
                            are stored locally in your browser.
                          </p>
                          <div className="space-y-4">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-semibold text-[#1c1c1e] dark:text-white">
                                  OpenAI API Key
                                </label>
                                <button
                                  onClick={handleFetchOpenAiModels}
                                  disabled={
                                    isFetchingOpenAiModels ||
                                    !vaultSettings.openAiKey
                                  }
                                  className="text-xs text-[#007aff] hover:underline disabled:opacity-50"
                                >
                                  {isFetchingOpenAiModels
                                    ? "Fetching..."
                                    : "Fetch Models"}
                                </button>
                              </div>
                              <div className="relative">
                                <input
                                  type="password"
                                  placeholder="sk-..."
                                  value={vaultSettings.openAiKey || ""}
                                  onChange={(e) =>
                                    setVaultSettings((prev: any) => ({
                                      ...prev,
                                      openAiKey: e.target.value,
                                    }))
                                  }
                                  className="w-full px-3 py-2 pr-16 bg-white dark:bg-[#252528] border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#007aff]"
                                />
                                {vaultSettings.openAiKey && (
                                  <button
                                    onClick={() =>
                                      setVaultSettings((prev: any) => ({
                                        ...prev,
                                        openAiKey: "",
                                      }))
                                    }
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-red-500 hover:text-red-600 font-medium px-2"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-semibold text-[#1c1c1e] dark:text-white">
                                  Anthropic API Key
                                </label>
                              </div>
                              <div className="relative">
                                <input
                                  type="password"
                                  placeholder="sk-ant-..."
                                  value={vaultSettings.anthropicKey || ""}
                                  onChange={(e) =>
                                    setVaultSettings((prev: any) => ({
                                      ...prev,
                                      anthropicKey: e.target.value,
                                    }))
                                  }
                                  className="w-full px-3 py-2 pr-16 bg-white dark:bg-[#252528] border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#007aff]"
                                />
                                {vaultSettings.anthropicKey && (
                                  <button
                                    onClick={() =>
                                      setVaultSettings((prev: any) => ({
                                        ...prev,
                                        anthropicKey: "",
                                      }))
                                    }
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-red-500 hover:text-red-600 font-medium px-2"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-semibold text-[#1c1c1e] dark:text-white">
                                  Google Gemini API Key
                                </label>
                                <button
                                  onClick={handleFetchGeminiModels}
                                  disabled={
                                    isFetchingGeminiModels ||
                                    !vaultSettings.geminiKey
                                  }
                                  className="text-xs text-[#007aff] hover:underline disabled:opacity-50"
                                >
                                  {isFetchingGeminiModels
                                    ? "Fetching..."
                                    : "Fetch Models"}
                                </button>
                              </div>
                              <div className="relative">
                                <input
                                  type="password"
                                  placeholder="AIza..."
                                  value={vaultSettings.geminiKey || ""}
                                  onChange={(e) =>
                                    setVaultSettings((prev: any) => ({
                                      ...prev,
                                      geminiKey: e.target.value,
                                    }))
                                  }
                                  className="w-full px-3 py-2 pr-16 bg-white dark:bg-[#252528] border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#007aff]"
                                />
                                {vaultSettings.geminiKey && (
                                  <button
                                    onClick={() =>
                                      setVaultSettings((prev: any) => ({
                                        ...prev,
                                        geminiKey: "",
                                      }))
                                    }
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-red-500 hover:text-red-600 font-medium px-2"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    {(!vaultSettings.llmType ||
                      vaultSettings.llmType === "local") && (
                      <>
                        <hr className="border-border" />
                        <div>
                          <h3 className="text-base font-bold text-[#1c1c1e] dark:text-white mb-1">
                            Advanced Generation Parameters
                          </h3>
                          <div className="p-4 bg-gray-50 dark:bg-[#1a1a1c] border border-border rounded-xl space-y-4">
                            <div>
                              <label className="block text-sm font-semibold text-[#1c1c1e] dark:text-white mb-1">
                                Temperature (
                                {vaultSettings.aiTemperature ?? 0.5})
                              </label>
                              <input
                                type="range"
                                min="0.1"
                                max="1.5"
                                step="0.1"
                                value={vaultSettings.aiTemperature ?? 0.5}
                                onChange={(e) =>
                                  setVaultSettings((prev: any) => ({
                                    ...prev,
                                    aiTemperature: parseFloat(e.target.value),
                                  }))
                                }
                                className="w-full accent-[#007aff]"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Higher values make output more random, lower
                                values make it more deterministic.
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-[#1c1c1e] dark:text-white mb-1">
                                Repetition Penalty (
                                {vaultSettings.aiRepetitionPenalty ?? 1.0})
                              </label>
                              <input
                                type="range"
                                min="1.0"
                                max="2.0"
                                step="0.05"
                                value={vaultSettings.aiRepetitionPenalty ?? 1.0}
                                onChange={(e) =>
                                  setVaultSettings((prev: any) => ({
                                    ...prev,
                                    aiRepetitionPenalty: parseFloat(
                                      e.target.value,
                                    ),
                                  }))
                                }
                                className="w-full accent-[#007aff]"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Higher values penalize the model for repeating
                                the same phrases.
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-[#1c1c1e] dark:text-white mb-1">
                                Max Tokens
                              </label>
                              <input
                                type="number"
                                min="50"
                                max="2048"
                                step="50"
                                value={vaultSettings.aiMaxTokens ?? 512}
                                onChange={(e) =>
                                  setVaultSettings((prev: any) => ({
                                    ...prev,
                                    aiMaxTokens: parseInt(e.target.value, 10),
                                  }))
                                }
                                className="w-full px-3 py-2 bg-white dark:bg-[#252528] border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#007aff]"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                The maximum length of the generated summary.
                              </p>
                            </div>
                          </div>
                        </div>

                        <hr className="border-border" />
                        <div>
                          <h3 className="text-base font-bold text-[#1c1c1e] dark:text-white mb-1">
                            Hardware Acceleration
                          </h3>
                          <div className="p-4 bg-gray-50 dark:bg-[#1a1a1c] border border-border rounded-xl">
                            {isCheckingHardware ? (
                              <div className="text-sm text-gray-500 animate-pulse">
                                Detecting hardware capabilities...
                              </div>
                            ) : hardwareStatus ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-[#1c1c1e] dark:text-white">
                                    Active Device:
                                  </span>
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded font-mono ${hardwareStatus.device === "webgpu" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"}`}
                                  >
                                    {hardwareStatus.device === "webgpu"
                                      ? "GPU (WebGPU)"
                                      : "CPU (WASM)"}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                  {hardwareStatus.device === "webgpu"
                                    ? "Great! The AI is using your graphics card. Generation will be extremely fast and efficient."
                                    : "WebGPU is not available. The AI is running on your CPU. Generation will take a few seconds and may use more battery."}
                                </p>
                              </div>
                            ) : (
                              <div className="text-sm text-red-500">
                                Failed to detect hardware status.
                              </div>
                            )}
                          </div>
                        </div>

                        <hr className="border-border" />
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-base font-bold text-[#1c1c1e] dark:text-white">
                              Model Management Dashboard
                            </h3>
                            <button
                              onClick={refreshModelsState}
                              disabled={isFetchingModels}
                              className="text-xs font-semibold text-[#007aff] hover:underline disabled:opacity-50"
                            >
                              {isFetchingModels
                                ? "Refreshing..."
                                : "Refresh Status"}
                            </button>
                          </div>
                          <div className="space-y-3">
                            {[
                              {
                                id: "onnx-community/SmolLM2-135M-Instruct-ONNX",
                                name: "SmolLM2-Instruct",
                                size: "135M",
                                desc: "Tiny LLaMA architecture, very fast.",
                              },
                            ].map((model) => {
                              const state = modelsState.find(
                                (s) => s.id === model.id,
                              ) || { isLoaded: false, isCached: false };
                              const loadingState = modelLoadingState[model.id];

                              return (
                                <div
                                  key={model.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#f4f4f5] dark:bg-card rounded-xl border border-border gap-4"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-semibold text-[#1c1c1e] dark:text-white">
                                        {model.name}
                                      </p>
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-mono">
                                        {model.size}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {model.desc}
                                    </p>
                                    <div className="flex gap-2 mt-2">
                                      {state.isLoaded && (
                                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                          Loaded (RAM)
                                        </span>
                                      )}
                                      {state.isCached && (
                                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                          Cached (Disk)
                                        </span>
                                      )}
                                      {!state.isLoaded && !state.isCached && (
                                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                          Not Downloaded
                                        </span>
                                      )}
                                    </div>
                                    {loadingState?.action === "downloading" &&
                                      loadingState.progress !== undefined && (
                                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3 dark:bg-gray-700 overflow-hidden">
                                          <div
                                            className="bg-blue-600 h-1.5 rounded-full"
                                            style={{
                                              width: `${loadingState.progress}%`,
                                            }}
                                          ></div>
                                        </div>
                                      )}
                                  </div>
                                  <div className="flex flex-wrap gap-2 shrink-0">
                                    <button
                                      onClick={() =>
                                        handleDownloadModel(model.id)
                                      }
                                      disabled={
                                        state.isCached ||
                                        state.isLoaded ||
                                        loadingState?.action === "downloading"
                                      }
                                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
                                    >
                                      {loadingState?.action === "downloading"
                                        ? "Downloading..."
                                        : "Download"}
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleUnloadModel(model.id)
                                      }
                                      disabled={
                                        !state.isLoaded || !!loadingState
                                      }
                                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors disabled:opacity-50"
                                    >
                                      Unload
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteModel(model.id)
                                      }
                                      disabled={
                                        !state.isCached || !!loadingState
                                      }
                                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ══ APPEARANCE TAB ═══════════════════════════ */}
            {settingsTab === "appearance" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-[#1c1c1e] dark:text-white mb-1">
                    Theme
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Choose your preferred colour scheme.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {(["system", "light", "dark"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() =>
                          setVaultSettings((prev: any) => ({
                            ...prev,
                            theme: mode,
                          }))
                        }
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                              ${
                                (vaultSettings.theme || "system") === mode
                                  ? "border-[#007aff] bg-[#007aff]/5"
                                  : "border-border hover:border-gray-300 dark:hover:border-gray-500"
                              }`}
                      >
                        <span className="text-2xl">
                          {mode === "system"
                            ? "🖥️"
                            : mode === "light"
                              ? "☀️"
                              : "🌙"}
                        </span>
                        <span className="text-sm font-medium text-[#1c1c1e] dark:text-white capitalize">
                          {mode}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="border-border" />

                <div>
                  <h3 className="text-base font-bold text-[#1c1c1e] dark:text-white mb-1">
                    Auto-Save
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Configure how the app handles note saving.
                  </p>
                  <div className="flex items-center justify-between p-4 bg-[#f4f4f5] dark:bg-card rounded-xl border border-border">
                    <div>
                      <p className="text-sm font-semibold text-[#1c1c1e] dark:text-white">
                        Auto-save on blur
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Automatically save when you click away from the editor
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setVaultSettings((prev: any) => ({
                          ...prev,
                          autoSave: !prev.autoSave,
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${vaultSettings.autoSave ? "bg-[#007aff]" : "bg-gray-300 dark:bg-gray-600"}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${vaultSettings.autoSave ? "translate-x-6" : "translate-x-1"}`}
                      />
                    </button>
                  </div>
                </div>

                <hr className="border-border" />

                <div>
                  <h3 className="text-base font-bold text-[#1c1c1e] dark:text-white mb-4">
                    Keyboard Shortcuts
                  </h3>
                  <div className="space-y-2">
                    {[
                      { shortcut: "⌘ K", desc: "Open Command Palette" },
                      { shortcut: "⌘ S", desc: "Save current note edit" },
                      { shortcut: "⌘ Z", desc: "Zen mode toggle" },
                      {
                        shortcut: "Esc",
                        desc: "Close modal / exit editing",
                      },
                    ].map((s) => (
                      <div
                        key={s.shortcut}
                        className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                      >
                        <span className="text-sm text-muted-foreground">
                          {s.desc}
                        </span>
                        <kbd className="px-2.5 py-1 bg-gray-100 dark:bg-card border border-border rounded-md text-xs font-mono text-gray-700 dark:text-gray-300 shadow-sm">
                          {s.shortcut}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ══ DATA TAB ══════════════════════════════ */}
            {settingsTab === "data" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                    Export Data
                  </h3>

                  <div className="bg-[#f9f9f9] dark:bg-[#252528] rounded-xl p-5 border border-border space-y-4">
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">
                        Backup Vault
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Download a complete ZIP archive of your entire vault,
                        including all markdown files, assets, and database.
                      </p>
                      <button
                        onClick={handleExportZip}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-card border border-border rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#1a1a1c] transition-colors shadow-sm disabled:opacity-50"
                      >
                        <span className="text-lg">📦</span>
                        {isExporting
                          ? "Exporting Vault..."
                          : "Export Vault to ZIP"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-[#f9f9f9]/50 dark:bg-[#1a1a1c]/50 flex justify-between items-center">
          <p className="text-xs text-gray-400">
            All settings are saved per-vault in the local database.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setSettingsOpen(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSaveSettings(vaultSettings)}
              disabled={isSavingConfig}
              className="bg-[#007aff] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-60"
            >
              {isSavingConfig ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
