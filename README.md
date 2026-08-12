<div align="center">
  <img src="buildResources/icon.icns" alt="Memoriser Logo" width="120" />
  <h1>🧠 Memoriser (Mneme)</h1>
  <p><strong>A blazingly fast, privacy-first, local-first knowledge management application.</strong></p>
  
  [![React](https://img.shields.io/badge/React-19.2-blue?logo=react&logoColor=white)](https://react.dev)
  [![Electron](https://img.shields.io/badge/Electron-30.0-4B8BBE?logo=electron&logoColor=white)](https://electronjs.org)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
  [![SQLite](https://img.shields.io/badge/SQLite-FTS5-003B57?logo=sqlite&logoColor=white)](https://sqlite.org)
  
  <br />
</div>

## 📖 Welcome to Memoriser
Memoriser bridges the gap between local markdown editing, Git-backed version control, and advanced AI capabilities. It is designed for researchers, students, and engineers who demand high performance and full ownership of their data.

This document serves as the **Engineer Onboarding Guide**. It contains everything you need to understand the architecture, run the app, debug issues, and contribute to the codebase.

---

## ✨ Core Features
- **Local-First Markdown:** All notes are stored as plain `.md` files on your disk. No cloud lock-in.
- **Lightning Fast Editor:** Custom-built React CodeMirror integration with live KaTeX rendering, Prettier auto-formatting, and intelligent frontmatter parsing.
- **Git & MkDocs Integration:** Automatically backs up your vault to GitHub. Click "Go Live" to instantly compile and serve a static MkDocs site locally.
- **Full-Text Search (FTS5):** Instantaneous search across thousands of notes powered by SQLite's FTS5 virtual tables.
- **Local AI Inference:** Summarization and auto-tagging run entirely on your local machine using `@huggingface/transformers` in a dedicated Web Worker.
- **Flashcard Spaced Repetition:** Built-in scheduling algorithm embedded directly into your note-taking workflow.

---

## 🏗️ Architecture Deep Dive

Memoriser follows a strict separation of concerns, leveraging the standard Electron Main/Renderer architecture, but fortified with strict typing and robust logging.

### 1. The Frontend (Renderer Process)
The frontend is a **React 19** Single Page Application built with **Vite** and styled with **TailwindCSS**.
- **State Management:** We use `zustand` for lightweight global state (e.g., UI toggles, current vault path) and React Context for scoped providers.
- **Centralized API Client:** The frontend NEVER imports Electron directly. All communication happens through `src/api/ipcClient.ts`, which calls `window.api`.
- **Feature-Sliced CodeMirror:** The editor is highly modularized using `@uiw/react-codemirror`, extending it with custom plugins for markdown parsing and live rendering.

### 2. The Backend (Main Process)
The Node.js backend handles all heavy lifting to keep the React UI at 60fps.
- **Modular Domain Handlers:** Business logic is separated into specific domains in `electron/handlers/` (e.g., `NoteHandlers.ts`, `ProjectHandlers.ts`, `GitHandlers.ts`). 
- **Better-SQLite3:** We use synchronous SQLite bindings. Why synchronous? Because IPC introduces latency, and `better-sqlite3` is so fast that running queries synchronously on the main thread is generally faster than asynchronous alternatives.
- **File System Watcher (`chokidar`):** Memoriser respects external edits. If you modify a Markdown file in VS Code or Obsidian, `chokidar` detects the change, parses the frontmatter, and instantly updates the SQLite database.

### 3. The Typed IPC Bridge
This is the central nervous system of Memoriser. We do not use magic strings for IPC channels.
- **The Contract:** `src/types/ipc.ts` defines the exact signature of every IPC method.
- **The Implementation:** `electron/typedIpc.ts` exposes `typedIpcHandle`, a generic wrapper that enforces the types from the contract on the backend handlers.
- **The Security:** `electron/preload.ts` safely exposes these methods to the frontend via the `contextBridge`.

---

## 🐞 Comprehensive Full-Stack Logging
Debugging Electron apps can be notoriously difficult. We have implemented a unified, full-stack logging architecture to make it painless.

1. **Frontend Console Mirroring:** 
   If a React component calls `console.log`, `console.warn`, or `console.error`, you don't need to open the Chrome DevTools. We intercept these calls in `src/main.tsx` and pipe them over IPC directly to the backend. They will appear in your terminal as `[Frontend ERROR]`.
2. **React Error Boundaries:**
   A global `<ErrorBoundary>` wraps the app. If a component crashes, it renders a fallback UI and automatically forwards the stack trace to the backend logs.
3. **IPC Request/Response Tracing:**
   Every single IPC call made between the frontend and backend is automatically intercepted by our wrapper in `typedIpcHandle`. You will see exact timings and payloads in your terminal:
   ```text
   [IPC Request] -> db:saveNote [{"id":"note1"...}]
   [IPC Response] <- db:saveNote (150ms) {"success":true}
   ```
4. **Production Logs:**
   In production, all terminal output is written to disk via `electron-log`. You can find the raw logs at `~/Library/Logs/memoriser/main.log`.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Python 3 (Optional, required for the "Go Live" MkDocs feature)

### Installation
1. **Clone & Install:**
   ```bash
   git clone https://github.com/Vikramadtya/Mneme.git
   cd Mneme
   npm install
   ```

2. **Start the Development Server:**
   ```bash
   npm run electron:dev
   ```
   This command uses `concurrently` to spin up the Vite dev server for the React frontend, waits for it to bind to port 5173, and then launches the Electron main process. Hot Module Replacement (HMR) is fully supported for both the frontend and backend!

---

## 🗺️ Codebase Map

When you are assigned a ticket, here is where you should look:

| Directory/File | Purpose |
|----------------|---------|
| `src/components/` | React UI components (Sidebar, EditorPane, Modals). |
| `src/application/` | Zustand stores and Custom React Hooks. |
| `src/types/ipc.ts` | **START HERE for new features.** Defines the API boundary. |
| `src/api/ipcClient.ts` | The frontend implementation of the IPC boundary. |
| `electron/main.ts` | Application entry point, window management, and global log setup. |
| `electron/handlers/` | Backend business logic (SQLite, Git, File System). |
| `electron/db/migrations.ts` | Database schema definitions. **Modify this to add new tables.** |
| `electron/watcher.ts` | The Chokidar file system watcher integration. |

---

## 🛠️ Advanced Development Notes

### 1. The "Go Live" Zombie Process
The "Go Live" feature spawns a Python `mkdocs serve` process on port 8000. Historically, hot-reloading the Electron app would orphan this process, causing subsequent launches to fail with "Address already in use". 
**Solution:** `AppHandlers.ts` contains a targeted `pkill -f` command that executes before launching a new MkDocs instance, ensuring total cleanup of zombie processes. Note: MkDocs can take ~30 seconds to compile a large vault initially.

### 2. Prettier Auto-Format
Markdown auto-formatting runs entirely in the backend during the `db:saveNote` execution. Due to Vite/Electron bundling quirks with dynamic imports in Prettier v3, we use a `customRequire` function to manually resolve `prettier/plugins/markdown` from the `node_modules` folder.

### 3. macOS Gatekeeper (The "Damaged App" Error)
When building the app locally using `npm run build:mac`, macOS assigns a quarantine flag to the `.app` or `.dmg` if it is transferred via a browser without Apple Codesigning/Notarization. 
If testing a `.dmg` and you see a "Memoriser is damaged" error, run:
```bash
xattr -cr /Applications/Memoriser.app
```
To fix this for production distribution, you must configure the `notarize` block in `package.json` with an active Apple Developer ID certificate.

---

## 🤝 Contributing
We adhere to strict formatting and linting rules. 
Before committing, always run:
```bash
npm run format
npm run lint
```
*(Husky pre-commit hooks are installed to enforce this automatically).*

Welcome to the team! 🎉
