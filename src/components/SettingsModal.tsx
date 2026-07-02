import React from "react";
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
              { id: "appearance", label: "Appearance", icon: "🎨" },
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
