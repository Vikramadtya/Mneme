import type { IpcHandlers, IpcResponse } from "../types/ipc";

export type { IpcResponse };

export const ipc = {
  invoke: <K extends keyof IpcHandlers>(
    channel: K,
    ...args: Parameters<IpcHandlers[K]>
  ): ReturnType<IpcHandlers[K]> => {
    return (window as any).ipcRenderer.invoke(channel, ...args);
  },
  on: (channel: string, listener: (...args: any[]) => void) => {
    (window as any).ipcRenderer.on(channel, listener);
    return () => (window as any).ipcRenderer.off(channel, listener);
  },
  off: (channel: string, listener: (...args: any[]) => void) => {
    (window as any).ipcRenderer.off(channel, listener);
  },
};
