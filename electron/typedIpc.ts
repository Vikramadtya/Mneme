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
  ipcMain.handle(channel, async (event, ...args) => {
    const startTime = Date.now();
    try {
      // Don't log huge arguments for saveNote to avoid spamming the log
      const safeArgs =
        channel === "db:saveNote"
          ? [
              args[0],
              {
                ...args[1],
                content: args[1]?.content ? "<CONTENT OMITTED>" : undefined,
              },
            ]
          : args;
      console.log(`[IPC Request] -> ${channel}`, JSON.stringify(safeArgs));

      const result = await (listener as any)(event, ...args);
      const duration = Date.now() - startTime;

      // Don't log huge results
      let safeResult = result;
      if (
        result &&
        typeof result === "object" &&
        "formattedContent" in result
      ) {
        safeResult = {
          ...result,
          formattedContent: result.formattedContent
            ? "<CONTENT OMITTED>"
            : undefined,
        };
      }

      console.log(
        `[IPC Response] <- ${channel} (${duration}ms)`,
        JSON.stringify(safeResult),
      );
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(
        `[IPC Error] <- ${channel} (${duration}ms):`,
        error.stack || error.message,
      );
      throw error;
    }
  });
}
