import type { Note, Project, ActivityLog, Commit } from "../types";

export interface IpcResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  url?: string;
}

export const ipc = {
  searchNotes: async (query: string): Promise<IpcResponse<any[]>> => {
    return (window as any).ipcRenderer.invoke("db:searchNotes", query);
  },
  exportVaultZip: async (
    vaultPath: string,
  ): Promise<IpcResponse<{ filePath: string }>> => {
    return (window as any).ipcRenderer.invoke("db:exportVaultZip", vaultPath);
  },
  selectVault: async (): Promise<IpcResponse<string>> => {
    return (window as any).ipcRenderer.invoke("app:selectVault");
  },
  getSettings: async (): Promise<IpcResponse<Record<string, string>>> => {
    return (window as any).ipcRenderer.invoke("db:getSettings");
  },
  saveSetting: async (key: string, value: string): Promise<IpcResponse> => {
    return (window as any).ipcRenderer.invoke("db:saveSetting", key, value);
  },
  saveSettings: async (settings: any): Promise<IpcResponse> => {
    return (window as any).ipcRenderer.invoke("db:saveSettings", settings);
  },
  syncGit: async (vaultPath: string): Promise<IpcResponse> => {
    return (window as any).ipcRenderer.invoke("git:sync", vaultPath);
  },
  commitLocal: async (vaultPath: string): Promise<IpcResponse> => {
    return (window as any).ipcRenderer.invoke("git:commitLocal", vaultPath);
  },
  getConfig: async (): Promise<any> => {
    return (window as any).ipcRenderer.invoke("app:getConfig");
  },
  setConfig: async (config: any): Promise<IpcResponse> => {
    return (window as any).ipcRenderer.invoke("app:setConfig", config);
  },
  readMkdocsConfig: async (vaultPath: string): Promise<IpcResponse<string>> => {
    return (window as any).ipcRenderer.invoke("fs:readMkdocsConfig", vaultPath);
  },
  saveMkdocsConfig: async (
    vaultPath: string,
    content: string,
  ): Promise<IpcResponse> => {
    return (window as any).ipcRenderer.invoke(
      "fs:saveMkdocsConfig",
      vaultPath,
      content,
    );
  },
  generateGithubAction: async (vaultPath: string): Promise<IpcResponse> => {
    return (window as any).ipcRenderer.invoke(
      "app:generateGithubAction",
      vaultPath,
    );
  },
  syncFromVault: async (vaultPath: string): Promise<IpcResponse> => {
    return (window as any).ipcRenderer.invoke("db:syncFromVault", vaultPath);
  },
  getInitialState: async (
    vaultPath: string,
  ): Promise<
    IpcResponse<{ projects: Project[]; allNotesMap: Record<string, Note[]> }>
  > => {
    return (window as any).ipcRenderer.invoke("db:getInitialState", vaultPath);
  },
  getVaultHistory: async (
    vaultPath: string,
  ): Promise<IpcResponse<Commit[]>> => {
    return (window as any).ipcRenderer.invoke("git:getVaultHistory", vaultPath);
  },
  getFileHistory: async (
    vaultPath: string,
    noteId: string,
  ): Promise<IpcResponse<Commit[]>> => {
    return (window as any).ipcRenderer.invoke(
      "git:getFileHistory",
      vaultPath,
      noteId,
    );
  },
  getFileContentAtCommit: async (
    vaultPath: string,
    noteId: string,
    commitHash: string,
  ): Promise<IpcResponse<string>> => {
    return (window as any).ipcRenderer.invoke(
      "git:getFileContentAtCommit",
      vaultPath,
      noteId,
      commitHash,
    );
  },
  toggleLive: async (
    vaultPath: string,
  ): Promise<IpcResponse<{ url?: string }>> => {
    return (window as any).ipcRenderer.invoke("app:toggleLive", vaultPath);
  },
  saveProject: async (
    vaultPath: string,
    project: Project,
  ): Promise<IpcResponse> => {
    return (window as any).ipcRenderer.invoke(
      "db:saveProject",
      vaultPath,
      project,
    );
  },
  getNoteContent: async (
    vaultPath: string,
    noteId: string,
  ): Promise<IpcResponse<string>> => {
    return (window as any).ipcRenderer.invoke(
      "db:getNoteContent",
      vaultPath,
      noteId,
    );
  },
  saveNote: async (vaultPath: string, note: Note): Promise<IpcResponse> => {
    return (window as any).ipcRenderer.invoke("db:saveNote", vaultPath, note);
  },
  deleteNote: async (
    vaultPath: string,
    noteId: string,
  ): Promise<IpcResponse> => {
    return (window as any).ipcRenderer.invoke(
      "db:deleteNote",
      vaultPath,
      noteId,
    );
  },
  logActivity: async (
    vaultPath: string,
    date: string,
    action: string,
  ): Promise<IpcResponse> => {
    return (window as any).ipcRenderer.invoke(
      "db:logActivity",
      vaultPath,
      date,
      action,
    );
  },
  getActivityLogs: async (
    vaultPath: string,
  ): Promise<IpcResponse<ActivityLog[]>> => {
    return (window as any).ipcRenderer.invoke("db:getActivityLogs", vaultPath);
  },
  on: (channel: string, listener: (...args: any[]) => void) => {
    (window as any).ipcRenderer.on(channel, listener);
    return () => (window as any).ipcRenderer.off(channel, listener);
  },
  off: (channel: string, listener: (...args: any[]) => void) => {
    (window as any).ipcRenderer.off(channel, listener);
  },
  saveAsset: async (
    vaultPath: string,
    asset: any,
    buffer: ArrayBuffer,
    projectId?: string,
  ): Promise<IpcResponse<{ filePath: string }>> => {
    return (window as any).ipcRenderer.invoke(
      "fs:saveAsset",
      vaultPath,
      asset,
      buffer,
      projectId,
    );
  },
  selectPdf: async (): Promise<IpcResponse<string>> => {
    return (window as any).ipcRenderer.invoke("app:selectPdf");
  },
  copyPdfAsset: async (
    vaultPath: string,
    sourcePath: string,
  ): Promise<IpcResponse<string>> => {
    return (window as any).ipcRenderer.invoke(
      "fs:copyPdfAsset",
      vaultPath,
      sourcePath,
    );
  },
  reportError: async (errorInfo: any): Promise<void> => {
    return (window as any).ipcRenderer.invoke("app:reportError", errorInfo);
  },
  openExternal: async (url: string): Promise<void> => {
    return (window as any).ipcRenderer.invoke("app:openExternal", url);
  },
};
