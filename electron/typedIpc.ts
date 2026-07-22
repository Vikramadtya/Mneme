import { ipcMain } from "electron";
import type { IpcHandlers } from "../src/types/ipc";

/**
 * A strongly-typed wrapper around ipcMain.handle.
 * This guarantees that the backend handler perfectly matches the shared contract.
 */
export function typedIpcHandle<K extends keyof IpcHandlers>(
  channel: K,
  listener: (
    event: Electron.IpcMainInvokeEvent,
    ...args: Parameters<IpcHandlers[K]>
  ) => ReturnType<IpcHandlers[K]> | Promise<ReturnType<IpcHandlers[K]>>,
) {
  // We cast listener to any here because Electron's internal type for listener
  // expects `any` arguments, but our generic strongly types it for the caller.
  ipcMain.handle(channel, listener as any);
}
