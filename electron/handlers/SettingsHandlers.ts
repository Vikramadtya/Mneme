import { SettingsRepository } from "../db/repositories/SettingsRepository";
import { ProjectRepository } from "../db/repositories/ProjectRepository";
import { NoteRepository } from "../db/repositories/NoteRepository";
import { safeStorage, app } from "electron";
import { typedIpcHandle } from "../typedIpc";

import { atomicWrite } from "../utils/atomicWrite";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { LRUCache } from "lru-cache";

const noteContentCache = new LRUCache<string, string>({ max: 100 });
import {
  sanitize,
  exists,
  resolveNotePath,
  customRequire,
  gitCache,
} from "../ipcHandlers";

const sharp = customRequire("sharp");
import { startWatcher, setAppWriting } from "../watcher";
import { BrowserWindow } from "electron";
import { store } from "./AppHandlers";

export function registerSettingsHandlers(ipcMain: any) {
  typedIpcHandle(
    "db:logActivity",
    async (_, vaultPath: string, date: string, action: string) => {
      const id = date + "_" + action;
      try {
        const row = await SettingsRepository.getActivityLogCount(id);
        if (row) {
          await SettingsRepository.incrementActivityLogCount(id);
        } else {
          await SettingsRepository.createActivityLog(id, date, action);
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
  );

  typedIpcHandle("db:getActivityLogs", async (_) => {
    try {
      const rows = await SettingsRepository.getActivityLogs();
      return { success: true, data: rows || [] };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Settings CRUD
  typedIpcHandle("db:getSettings", async (_) => {
    try {
      const rows = await SettingsRepository.getAllSettings();
      const settings: Record<string, string> = {};
      const encryptedKeys = [
        "gitGithubToken",
        "openAiKey",
        "anthropicKey",
        "geminiKey",
      ];

      // Load non-encrypted keys from SQLite
      (rows || []).forEach((r) => {
        if (!encryptedKeys.includes(r.key)) {
          settings[r.key] = r.value;
        }
      });

      // Load encrypted keys from electron-store
      encryptedKeys.forEach((key) => {
        const val = store.get(key) as string | undefined;
        if (val) {
          if (safeStorage.isEncryptionAvailable()) {
            try {
              settings[key] = safeStorage.decryptString(
                Buffer.from(val, "base64"),
              );
            } catch (e) {
              console.error(`Failed to decrypt ${key}:`, e);
              // Fallback just in case it was stored unencrypted
              settings[key] = val;
            }
          } else {
            settings[key] = val;
          }
        }
      });

      return { success: true, data: settings };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  typedIpcHandle("db:saveSetting", async (_, key: string, value: string) => {
    const encryptedKeys = [
      "gitGithubToken",
      "openAiKey",
      "anthropicKey",
      "geminiKey",
    ];
    try {
      if (encryptedKeys.includes(key)) {
        let finalValue = value;
        if (safeStorage.isEncryptionAvailable()) {
          finalValue = safeStorage.encryptString(value).toString("base64");
        }
        store.set(key, finalValue);
      } else {
        await runDb(
          "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
          [key, value],
        );
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  typedIpcHandle(
    "db:saveSettings",
    async (_, settings: Record<string, string>) => {
      try {
        await NoteRepository.beginTransaction();
        const encryptedKeys = [
          "gitGithubToken",
          "openAiKey",
          "anthropicKey",
          "geminiKey",
        ];
        for (const [key, value] of Object.entries(settings)) {
          if (encryptedKeys.includes(key)) {
            let finalValue = value;
            if (safeStorage.isEncryptionAvailable()) {
              finalValue = safeStorage.encryptString(value).toString("base64");
            }
            store.set(key, finalValue);
          } else {
            await runDb(
              "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
              [key, value],
            );
          }
        }
        await NoteRepository.commitTransaction();
        return { success: true };
      } catch (err: any) {
        await NoteRepository.rollbackTransaction()(() => {});
        return { success: false, error: err.message };
      }
    },
  );
}
