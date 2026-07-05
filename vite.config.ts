import { defineConfig } from "vite";
import path from "node:path";
import electron from "vite-plugin-electron/simple";
import reactSWC from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import AutoImport from "unplugin-auto-import/vite";
import checker from "vite-plugin-checker";

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ["better-sqlite3"],
  },
  build: {
    rollupOptions: {
      external: ["better-sqlite3", "simple-git"],
    },
  },
  ssr: {
    external: ["better-sqlite3", "simple-git"],
  },
  plugins: [
    tailwindcss(),
    reactSWC(),
    checker({ typescript: true }),
    AutoImport({
      imports: ["react"],
      dts: true,
    }),
    electron({
      main: {
        entry: "electron/main.ts",
        vite: {
          ssr: {
            external: ["better-sqlite3", "simple-git"],
          },
          optimizeDeps: {
            exclude: ["better-sqlite3"],
          },
          build: {
            rollupOptions: {
              external: ["better-sqlite3", "simple-git"],
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, "electron/preload.ts"),
      },
      renderer: {},
    }),
  ],
});
