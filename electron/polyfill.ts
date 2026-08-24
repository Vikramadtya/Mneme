import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

if (typeof globalThis.__filename === "undefined") {
  globalThis.__filename = fileURLToPath(import.meta.url);
}
if (typeof globalThis.__dirname === "undefined") {
  globalThis.__dirname = dirname(globalThis.__filename);
}
