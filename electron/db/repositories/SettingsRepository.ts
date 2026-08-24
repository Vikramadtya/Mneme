import { getDb, runDb } from "../../ipcHandlers";

export const SettingsRepository = {
  getSettingValue: (key: string) => {
    return getDb("SELECT value FROM settings WHERE key = ?", [key])[0];
  },

  getAllSettings: () => {
    return getDb("SELECT key, value FROM settings");
  },

  getEncryptedSettings: () => {
    return getDb("SELECT * FROM settings WHERE is_encrypted = 1");
  },

  saveSetting: async (key: string, value: string, isEncrypted: number) => {
    await runDb(
      "INSERT OR REPLACE INTO settings (key, value, is_encrypted) VALUES (?, ?, ?)",
      [key, value, isEncrypted],
    );
  },

  deleteSetting: async (key: string) => {
    await runDb("DELETE FROM settings WHERE key = ?", [key]);
  },

  getActivityLogCount: (id: string) => {
    return getDb("SELECT count FROM activity_logs WHERE id = ?", [id])[0];
  },

  incrementActivityLogCount: async (id: string) => {
    await runDb("UPDATE activity_logs SET count = count + 1 WHERE id = ?", [
      id,
    ]);
  },

  createActivityLog: async (id: string, date: string, action: string) => {
    await runDb(
      "INSERT INTO activity_logs (id, date, action, count) VALUES (?, ?, ?, 1)",
      [id, date, action],
    );
  },

  getActivityLogs: () => {
    return getDb(
      "SELECT date, SUM(count) as count FROM activity_logs GROUP BY date ORDER BY date ASC",
    );
  },

  beginTransaction: async () => {
    await runDb("BEGIN TRANSACTION");
  },

  commitTransaction: async () => {
    await runDb("COMMIT");
  },

  rollbackTransaction: async () => {
    await runDb("ROLLBACK");
  },
};
