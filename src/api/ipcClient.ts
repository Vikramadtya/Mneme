import type { Note, Project, ActivityLog, Commit } from "../domain/models";
import type { IpcHandlers, IpcResponse } from "../types/ipc";

const invoke = <K extends keyof IpcHandlers>(
  channel: K,
  ...args: Parameters<IpcHandlers[K]>
): ReturnType<IpcHandlers[K]> => {
  return (window as any).ipcRenderer.invoke(channel, ...args) as ReturnType<
    IpcHandlers[K]
  >;
};

export const ipcClient = {
  on: (channel: string, listener: (...args: any[]) => void) => {
    (window as any).ipcRenderer.on(channel, listener);
    return () => (window as any).ipcRenderer.off(channel, listener);
  },
  off: (channel: string, listener: (...args: any[]) => void) => {
    (window as any).ipcRenderer.off(channel, listener);
  },
  db: {
    getInitialState: (vaultPath: string) =>
      invoke("db:getInitialState", vaultPath),
    saveProject: (vaultPath: string, project: Project) =>
      invoke("db:saveProject", vaultPath, project),
    archiveProject: (vaultPath: string, projectId: string) =>
      invoke("db:archiveProject", vaultPath, projectId),
    unarchiveProject: (vaultPath: string, projectId: string) =>
      invoke("db:unarchiveProject", vaultPath, projectId),
    deleteProject: (vaultPath: string, projectId: string) =>
      invoke("db:deleteProject", vaultPath, projectId),
    deleteChapter: (vaultPath: string, chapterId: string) =>
      invoke("db:deleteChapter", vaultPath, chapterId),

    getNoteContent: (vaultPath: string, noteId: string) =>
      invoke("db:getNoteContent", vaultPath, noteId),
    saveNote: (vaultPath: string, note: Note) =>
      invoke("db:saveNote", vaultPath, note),
    deleteNote: (vaultPath: string, noteId: string) =>
      invoke("db:deleteNote", vaultPath, noteId),
    searchNotes: (query: string) => invoke("db:searchNotes", query),

    getTrash: (vaultPath: string) => invoke("db:getTrash", vaultPath),
    restoreNote: (vaultPath: string, fileName: string) =>
      invoke("db:restoreNote", vaultPath, fileName),
    emptyTrash: (vaultPath: string) => invoke("db:emptyTrash", vaultPath),

    logActivity: (vaultPath: string, date: string, action: string) =>
      invoke("db:logActivity", vaultPath, date, action),
    getActivityLogs: (vaultPath: string) =>
      invoke("db:getActivityLogs", vaultPath),
    getSettings: () => invoke("db:getSettings"),
    saveSetting: (key: string, value: string) =>
      invoke("db:saveSetting", key, value),
    saveSettings: (settings: any) => invoke("db:saveSettings", settings),

    syncFromVault: (vaultPath: string) => invoke("db:syncFromVault", vaultPath),
    exportVaultZip: (vaultPath: string) =>
      invoke("db:exportVaultZip", vaultPath),
  },
  fs: {
    saveAsset: (
      vaultPath: string,
      asset: string,
      buffer: ArrayBuffer,
      projectId?: string,
    ) => invoke("fs:saveAsset", vaultPath, asset, buffer, projectId),
    copyPdfAsset: (vaultPath: string, sourcePath: string) =>
      invoke("fs:copyPdfAsset", vaultPath, sourcePath),
    readMkdocsConfig: (vaultPath: string) =>
      invoke("fs:readMkdocsConfig", vaultPath),
    saveMkdocsConfig: (vaultPath: string, content: string) =>
      invoke("fs:saveMkdocsConfig", vaultPath, content),
  },
  git: {
    sync: (vaultPath: string) => invoke("git:sync", vaultPath),
    status: (vaultPath: string) => invoke("git:status", vaultPath),
    commitAll: (vaultPath: string, message: string) =>
      invoke("git:commitAll", vaultPath, message),
    commitLocal: (vaultPath: string) => invoke("git:commitLocal", vaultPath),
    squashHistory: (vaultPath: string) =>
      invoke("git:squashHistory", vaultPath),
    getVaultHistory: (vaultPath: string) =>
      invoke("git:getVaultHistory", vaultPath),
    getFileHistory: (vaultPath: string, noteId: string) =>
      invoke("git:getFileHistory", vaultPath, noteId),
    getFileContentAtCommit: (
      vaultPath: string,
      noteId: string,
      commitHash: string,
    ) => invoke("git:getFileContentAtCommit", vaultPath, noteId, commitHash),
  },
  app: {
    selectVault: () => invoke("app:selectVault"),
    getConfig: () => invoke("app:getConfig"),
    setConfig: (config: any) => invoke("app:setConfig", config),
    selectPdf: () => invoke("app:selectPdf"),
    toggleLive: (vaultPath: string) => invoke("app:toggleLive", vaultPath),
    generateGithubAction: (vaultPath: string) =>
      invoke("app:generateGithubAction", vaultPath),
    openExternal: (url: string) => invoke("app:openExternal", url),
    reportError: (error: any) => invoke("app:reportError", error),
  },
};
