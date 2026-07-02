import { ipcRenderer, contextBridge } from "electron";

// Track wrapped listeners so off() can correctly remove them
const listenerMap = new WeakMap<Function, Function>();

// --------- Expose IPC API to the Renderer process ---------
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(channel: string, listener: (...args: any[]) => void) {
    const wrapped = (_event: any, ...args: any[]) => listener(...args);
    listenerMap.set(listener, wrapped);
    ipcRenderer.on(channel, wrapped as any);
  },
  off(channel: string, listener: (...args: any[]) => void) {
    const wrapped = listenerMap.get(listener);
    if (wrapped) {
      ipcRenderer.off(channel, wrapped as any);
      listenerMap.delete(listener);
    }
  },
  send(channel: string, ...args: any[]) {
    ipcRenderer.send(channel, ...args);
  },
  invoke(channel: string, ...args: any[]) {
    return ipcRenderer.invoke(channel, ...args);
  },
});
