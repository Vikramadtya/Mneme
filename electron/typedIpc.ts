import { ipcMain } from "electron";
import { IpcHandlers } from "../src/types/ipc";

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
      const verbose = process.env.VERBOSE === "true";

      const safeArgs =
        channel === "db:saveNote"
          ? [
              args[0],
              {
                ...args[1],
                content: (args[1] as any)?.content
                  ? "<CONTENT OMITTED>"
                  : undefined,
              },
            ]
          : args;

      if (verbose) {
        console.log(`[IPC Request] -> ${channel}`, JSON.stringify(safeArgs));
      }

      const result = await (listener as any)(event, ...args);
      const duration = Date.now() - startTime;

      let safeResult = result;
      if (
        result &&
        typeof result === "object" &&
        "formattedContent" in result
      ) {
        safeResult = {
          ...result,
          formattedContent: (result as any).formattedContent
            ? "<CONTENT OMITTED>"
            : undefined,
        };
      }

      if (verbose) {
        console.log(
          `[IPC Response] <- ${channel} (${duration}ms)`,
          JSON.stringify(safeResult),
        );
      }
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
