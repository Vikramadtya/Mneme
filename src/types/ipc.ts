import type { Note, Project, ActivityLog, Commit } from "../domain/models";

export interface IpcResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  url?: string;
}

export interface IpcHandlers {
  "db:searchNotes": (query: string) => Promise<IpcResponse<any[]>>;
  "db:exportVaultZip": (
    vaultPath: string,
  ) => Promise<IpcResponse<{ filePath: string }>>;
  "app:selectVault": () => Promise<IpcResponse<string>>;
  "db:getSettings": () => Promise<IpcResponse<Record<string, string>>>;
  "db:saveSetting": (key: string, value: string) => Promise<IpcResponse>;
  "db:saveSettings": (settings: any) => Promise<IpcResponse>;
  "git:sync": (vaultPath: string) => Promise<IpcResponse>;
  "git:status": (vaultPath: string) => Promise<IpcResponse<any>>;
  "git:commitAll": (vaultPath: string, message: string) => Promise<IpcResponse>;
  "git:squashHistory": (vaultPath: string) => Promise<IpcResponse>;
  "git:commitLocal": (vaultPath: string) => Promise<IpcResponse>;
  "app:getConfig": () => Promise<any>;
  "app:setConfig": (config: any) => Promise<IpcResponse>;
  "fs:readMkdocsConfig": (vaultPath: string) => Promise<IpcResponse<string>>;
  "fs:saveMkdocsConfig": (
    vaultPath: string,
    content: string,
  ) => Promise<IpcResponse>;
  "app:generateGithubAction": (vaultPath: string) => Promise<IpcResponse>;
  "db:syncFromVault": (vaultPath: string) => Promise<IpcResponse>;
  "db:getInitialState": (
    vaultPath: string,
  ) => Promise<
    IpcResponse<{ projects: Project[]; allNotesMap: Record<string, Note[]> }>
  >;
  "git:getVaultHistory": (vaultPath: string) => Promise<IpcResponse<Commit[]>>;
  "git:getFileHistory": (
    vaultPath: string,
    noteId: string,
  ) => Promise<IpcResponse<Commit[]>>;
  "git:getFileContentAtCommit": (
    vaultPath: string,
    noteId: string,
    commitHash: string,
  ) => Promise<IpcResponse<string>>;
  "app:toggleLive": (
    vaultPath: string,
  ) => Promise<IpcResponse<{ url?: string }>>;
  "db:saveProject": (
    vaultPath: string,
    project: Project,
  ) => Promise<IpcResponse>;
  "db:archiveProject": (
    vaultPath: string,
    projectId: string,
  ) => Promise<IpcResponse>;
  "db:unarchiveProject": (
    vaultPath: string,
    projectId: string,
  ) => Promise<IpcResponse>;
  "db:getNoteContent": (
    vaultPath: string,
    noteId: string,
  ) => Promise<IpcResponse<string>>;
  "db:saveNote": (vaultPath: string, note: Note) => Promise<IpcResponse>;
  "db:deleteNote": (vaultPath: string, noteId: string) => Promise<IpcResponse>;
  "db:logActivity": (
    vaultPath: string,
    date: string,
    action: string,
  ) => Promise<IpcResponse>;
  "db:getActivityLogs": (
    vaultPath: string,
  ) => Promise<IpcResponse<ActivityLog[]>>;
  "fs:saveAsset": (
    vaultPath: string,
    asset: any,
    buffer: ArrayBuffer,
    projectId?: string,
  ) => Promise<IpcResponse<{ filePath: string }>>;
  "app:selectPdf": () => Promise<IpcResponse<string>>;
  "fs:copyPdfAsset": (
    vaultPath: string,
    sourcePath: string,
  ) => Promise<IpcResponse<string>>;
  "app:reportError": (errorInfo: any) => Promise<void>;
  "app:openExternal": (url: string) => Promise<void>;
}
