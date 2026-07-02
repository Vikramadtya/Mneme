import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Writes data to a file atomically.
 * It first writes to a temporary file, calls fsync to flush OS buffers,
 * and then renames it to the destination file.
 */
export async function atomicWrite(
  filePath: string,
  data: string | Buffer,
  options?: { encoding?: BufferEncoding; mode?: number },
): Promise<void> {
  const dir = path.dirname(filePath);
  const name = path.basename(filePath);
  const tmpName = `${name}.${crypto.randomBytes(8).toString("hex")}.tmp`;
  const tmpPath = path.join(dir, tmpName);

  let fileHandle: fs.FileHandle | null = null;
  try {
    await fs.mkdir(dir, { recursive: true });
    fileHandle = await fs.open(tmpPath, "w", options?.mode || 0o666);
    await fileHandle.writeFile(data, options?.encoding || "utf-8");
    await fileHandle.sync(); // Force OS to flush buffer to disk
  } catch (error) {
    if (fileHandle) {
      await fileHandle.close().catch(() => {});
    }
    await fs.unlink(tmpPath).catch(() => {});
    throw error;
  }

  if (fileHandle) {
    await fileHandle.close();
  }

  try {
    await fs.rename(tmpPath, filePath);
  } catch (error) {
    await fs.unlink(tmpPath).catch(() => {});
    throw error;
  }
}
