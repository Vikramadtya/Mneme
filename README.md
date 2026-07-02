# Memoriser - The Comprehensive Technical Manual

Welcome to the definitive developer guide for **Memoriser**. This document serves as the absolute single source of truth for the application's architecture, configurations, internal data flows, and UI styling conventions. Spanning an exhaustive depth, it is designed so that any developer can read this manual and understand exactly how to troubleshoot, extend, or maintain any facet of the codebase.

## Table of Contents
1. [Core Philosophy & Paradigm](#core-philosophy--paradigm)
2. [Tech Stack & Dependency Overview](#tech-stack--dependency-overview)
3. [Configuration Files Breakdown](#configuration-files-breakdown)
4. [Backend Architecture (Main Process)](#backend-architecture-main-process)
5. [Frontend Architecture (Renderer Process)](#frontend-architecture-renderer-process)
6. [Data Flows & Core Operations](#data-flows--core-operations)
7. [Styling & UI Component Strategy](#styling--ui-component-strategy)
8. [Troubleshooting Guide](#troubleshooting-guide)

---

## 1. Core Philosophy & Paradigm

Memoriser is a modern, high-performance desktop application built on top of the Electron framework. It is fundamentally an offline-first, Git-synced knowledge base integrated tightly with spaced-repetition learning mechanics.

### 1.1 Local-First Architecture
Unlike cloud-native applications that lock user data behind proprietary APIs and opaque database structures, Memoriser treats the local filesystem as the absolute source of truth. Every Note, Book, and Course is persisted as plain Markdown (`.md`) files on the user's local disk. The internal SQLite database is completely ephemeral from a structural perspective—it acts strictly as an extremely fast, relational indexing layer to enable near-instantaneous search, graph relationships, and spaced-repetition flashcard state tracking. If the database is lost, the plain text data remains perfectly intact and accessible.

### 1.2 Git-Backed State Integrity
We recognize that knowledge bases undergo constant revision. Memoriser leverages `simple-git` to silently manage a Git repository inside the user's chosen Vault directory. Every substantive write operation—saving a note, creating a project, or updating settings—triggers an automatic atomic Git commit. This provides an incorruptible time-machine (accessible via the `VaultHistoryModal`) allowing users to track granular changes or revert specific files without ever leaving the application.

### 1.3 The Structured Knowledge Paradigm
A central thesis of Memoriser is that flat hierarchies (a single massive folder of notes) lead to cognitive overload and "knowledge hoarding" rather than learning. Memoriser enforces two strict hierarchical trees:
1. **Books → Chapters → Notes**: For linear, sequential reading and parsing of existing monolithic material.
2. **Courses → Modules → Notes**: For structured, objective-based learning environments.
These structures are inherently mapped to the filesystem (e.g., `/Vault/Books/[Book Name]/[Chapter Name]/[Note].md`). 

### 1.4 Integrated Active Recall
Spaced repetition is not treated as an external plugin or afterthought. Flashcards are tightly integrated into the Markdown editing experience. Memoriser parses specific Markdown blocks or UI interactions to create flashcards, tracking their state in the SQLite database utilizing a customized SM-2 spaced repetition algorithm. The `ReviewContext` calculates optimal review intervals and dynamically builds daily review queues.

---

## 2. Tech Stack & Dependency Overview

The application utilizes a vast array of modern web technologies split across the two primary Electron environments: the Main (Node.js) process and the Renderer (Browser) process. This section exhaustively details the tools and libraries powering the application.

### 2.1 The Core Triad
- **Electron (v29.x)**: The shell that hosts the application. We utilize Electron for its deep OS integration capabilities (FileSystem API, Process Spawning) while providing a rich Chromium-based rendering context. The IPC (Inter-Process Communication) bridge is the backbone of our architecture.
- **React (v18.2.0)**: The declarative UI library powering the Renderer process. We leverage React 18's concurrent rendering features heavily to keep the UI perfectly responsive even when parsing thousands of lines of Markdown or rendering complex D3 graphs.
- **Vite (v5.x)**: The ultra-fast build tool replacing Webpack. Vite dramatically accelerates HMR (Hot Module Replacement) during development and optimizes the final asset bundle using Rollup.

### 2.2 Main Process Dependencies (Backend)
The following libraries execute strictly within the Node.js Main Process:
- **`better-sqlite3`**: The fastest and simplest synchronous SQLite3 driver for Node.js. Because it operates synchronously, it eliminates promise overhead, making our highly complex JOIN queries for flashcard state instantaneous.
- **`simple-git`**: A lightweight interface for running native `git` commands via Node.js. Memoriser does not bundle a custom Git binary; it requires Git to be installed on the host OS. `simple-git` acts as a programmatic wrapper around the CLI.
- **`chokidar`**: An elegant, robust file-watching library. Because the user might edit Markdown files in an external editor (like Obsidian or VSCode) while Memoriser is running, `chokidar` monitors the Vault directory for external I/O changes and broadcasts IPC events to the Renderer to automatically reload the active note or re-sync the sidebar tree.
- **`electron-log`**: Used for persistent, structured logging. Logs are written to the OS-specific AppData log directories (e.g., `~/Library/Logs/Memoriser/main.log`). This is crucial for debugging production issues where the DevTools are unavailable.
- **`electron-updater`**: Handles seamless OTA (Over-The-Air) updates by pulling the latest `.zip` or `.dmg` releases from the GitHub Releases API.

### 2.3 Renderer Process Dependencies (Frontend UI)
The following libraries execute within the Chromium rendering engine:
- **Tailwind CSS (v3.4)**: A utility-first CSS framework. We have strictly enforced a paradigm where 99% of styling is done via Tailwind utility classes, completely avoiding traditional `.css` stylesheets (with the exception of `index.css` for root CSS variables and standard base resets).
- **`lucide-react`**: A beautiful, consistent icon library. Used globally for every icon in the application to ensure visual coherence.
- **`@dnd-kit/core` & `@dnd-kit/sortable`**: A lightweight, performant, and highly customizable drag-and-drop toolkit. This powers the complex visual reordering of Books, Courses, and Chapters within the `LeftSidebar`. It uses a custom collision detection algorithm to handle nested sorting.
- **`react-markdown`**: The engine responsible for converting plain text Markdown into React components.
- **`remark-gfm` & `remark-math`**: Remark plugins that extend `react-markdown` to support GitHub Flavored Markdown (tables, task lists, strikethroughs) and raw LaTeX math equations.
- **`rehype-highlight` & `rehype-katex`**: Rehype plugins that apply syntax highlighting to code blocks and render the mathematical AST generated by `remark-math` into beautiful HTML via KaTeX.
- **`date-fns`**: A modern, functional utility library for parsing, formatting, and calculating differences between dates. Used extensively in the Spaced Repetition logic and Git History UI.
- **`cmdk`**: An accessible command menu React component. This powers the global `Cmd+K` palette, allowing users to rapidly search notes, trigger settings, or execute global commands without touching the mouse.
- **`d3`**: A JavaScript library for manipulating documents based on data. D3 powers the interactive Knowledge Graph visualization, simulating physical forces between connected notes to dynamically map the user's vault.

### 2.4 Build & Developer Tooling
- **`electron-builder`**: The standard packing tool for Electron apps. It takes our Vite-compiled assets and bundles them into OS-specific distributables (`.app`, `.dmg`, `.exe`, `.AppImage`).
- **`typescript` (v5.x)**: Provides rigorous static type checking across both the Main and Renderer processes.
- **`oxlint`**: An ultra-fast, Rust-based linter that serves as a drop-in replacement for much of ESLint's core ruleset, significantly reducing CI/CD execution time.
- **`prettier`**: An opinionated code formatter ensuring absolute stylistic consistency across all source code files.

---


## 3. Configuration Files Breakdown

Memoriser relies on several configuration files that define its build pipeline, linting constraints, and typescript strictness. This section breaks down the pivotal files.

### 3.1 `package.json`
The `package.json` file is bifurcated into two logical segments: dependencies intended for the runtime (bundled with Electron) and devDependencies (used during the Vite build step).
- **Scripts**: 
  - `"dev"`: Runs `vite` in dev mode and concurrently spawns `electron .`.
  - `"build"`: Compiles the React app via `tsc && vite build`, then triggers `electron-builder` to package the app.
  - `"lint"`: Triggers `oxlint` for rapid syntax linting and `prettier --check`.
- **`build` Object**: This dictates the `electron-builder` configuration. It defines the `appId` (e.g., `com.memoriser.app`), the macOS entitlements (required for microphone/camera access if we ever add them), and the exact output directories (e.g., `release/`).

### 3.2 `vite.config.ts`
Vite is configured specifically to work within an Electron environment.
- **Base Path**: The base is set to `./` instead of `/`. This is absolutely critical. Electron loads the `index.html` file via the `file://` protocol, meaning absolute paths will resolve to the root of the user's hard drive, breaking all asset imports.
- **Plugins**: Includes `@vitejs/plugin-react` for standard JSX transformations and Fast Refresh.
- **Build Output**: The output directory is explicitly set to `dist`, overriding the Vite default if necessary, so that `electron-builder` knows precisely where to grab the compiled HTML/JS/CSS assets.

### 3.3 TypeScript Configurations
Because the Main process and Renderer process run in entirely different environments (Node.js vs Browser), they require distinct TS configurations.
- **`tsconfig.json`**: The root config. It references the other configurations via project references.
- **`tsconfig.node.json`**: Configures the Main process. Sets `moduleResolution` to `node`, `target` to `ESNext`, and explicitly includes types for Node and Electron APIs. It targets the `electron/` directory.
- **`tsconfig.app.json`**: Configures the Renderer process. Sets `moduleResolution` to `bundler`, includes DOM typings, and targets the `src/` directory. Strict mode is rigorously enabled in both (`"strict": true`).

### 3.4 `.oxlintrc.json` & `.prettierrc`
- **Oxlint**: We use Oxlint instead of ESLint for performance. The RC file disables certain rules (e.g., `no-explicit-any` is turned off in specific handlers where IPC boundaries require flexible typings).
- **Prettier**: Enforces 2-space indentation, trailing commas (for cleaner git diffs), and strict single-quote/double-quote standards to prevent stylistic merge conflicts.

---

## 4. Backend Architecture (Main Process)

The Main process is the brain of the application. It boots first, manages the OS window, reads from the disk, and answers IPC queries from the frontend.

### 4.1 Application Lifecycle (`main.ts`)
When the user launches the app, `main.ts` executes.
1. **Bootstrapping**: It calls `app.whenReady()`.
2. **Window Creation**: It spawns a new `BrowserWindow` with `nodeIntegration: false` and `contextIsolation: true` for security. The `preload.ts` script is attached here.
3. **IPC Registration**: It imports `ipcHandlers.ts` and registers all `ipcMain.handle()` listeners.
4. **Environment Check**: In development (`process.env.VITE_DEV_SERVER_URL`), it loads the Vite dev server URL. In production, it loads `file://${path.join(__dirname, '../dist/index.html')}`.

### 4.2 Security Model (`preload.ts`)
To prevent the Chromium frontend from having unfettered access to the Node.js API (a massive security risk), we use a Context Bridge. `preload.ts` selectively exposes a safe `window.ipcRenderer.invoke()` function. The frontend can only send messages over predefined IPC channels (e.g., `db:getNotes`, `fs:readFile`), it cannot directly execute `fs.rmdir()` or `child_process.exec()`.

### 4.3 IPC Handlers & Controllers
The IPC handlers in `electron/ipcHandlers.ts` act as routers. They receive requests and delegate them to specific handler modules:
- **`AppHandlers.ts`**: Handles global application state, such as calling the OS native "Select Directory" dialog (`dialog.showOpenDialog`) to choose a Vault path, and reading/writing the `config.json` inside the AppData directory.
- **`DbHandlers.ts`**: The most complex module. It interacts directly with `better-sqlite3`. 
  - When `db:saveNote` is called, it translates the Javascript object into an `UPDATE` or `INSERT` SQL statement.
  - It handles the bidirectional resolution between SQLite Project IDs and physical file paths via the `resolveNotePath` helper.
- **`FsHandlers.ts`**: Wraps raw Node.js `fs` module commands for tasks like image uploading (`saveAsset`) or reading raw PDF buffers for the `PdfViewerModal`.
- **`GitHandlers.ts`**: Wraps `simple-git`. When `git:sync` is called, it spawns a sequence of `git add .`, `git commit`, `git pull --rebase`, and `git push`.

### 4.4 SQLite Schema & Migrations (`migrations.ts`)
The internal schema is entirely managed in code. Upon startup, `DbHandlers.ts` checks the `schema_migrations` table. If the database version is lower than the codebase version, it executes the migration scripts in `migrations.ts`.
- **`projects` Table**: Tracks the hierarchy (id, parent_id, name, type, updated_at). Type can be `book`, `chapter`, `course`, `module`.
- **`notes` Table**: Tracks specific notes (id, project_id, title, content, created_at, updated_at). Note that `content` is cached here for ultra-fast full-text search, but the disk `.md` file is the ultimate source of truth.
- **`flashcards` Table**: Tracks SRS state (id, note_id, front, back, next_review, ease_factor, interval, repetitions). This table is heavily JOIN'd with `notes` during daily review generation.
- **`activity_logs` Table**: A simple append-only ledger tracking daily activity (e.g., "Created note X", "Reviewed 20 cards").

### 4.5 Data Write Integrity (`atomicWrite.ts`)
Because Memoriser is an offline-first app, interrupting a write operation (e.g., laptop battery dying while saving a 10,000-word note) could result in a 0-byte corrupted file. 
To prevent this, we never use a raw `fs.writeFile`. Instead, all saves route through `atomicWrite(filePath, data)`:
1. It writes the data to a randomly named temporary file (`filePath.tmp.hex`).
2. It calls `fileHandle.sync()` to force the OS to flush its memory buffers directly to the physical SSD/HDD platter.
3. It uses `fs.rename()` to swap the temporary file over the original file. This operation is atomic at the OS file-system level, guaranteeing that the file is either completely updated or completely untouched.

---


## 5. Frontend Architecture (Renderer Process)

The React frontend is architected heavily around a "Context Pyramid". Because the application is a desktop app (not a standard web app with distinct URLs), we do not use React Router. The entire UI state is managed in-memory via Contexts, and components are dynamically swapped based on the active tab and selected project.

### 5.1 The Context Pyramid
If you open `src/application/context/AppProvider.tsx`, you will see a nested structure of Context Providers. They are strictly ordered by dependency and lifecycle breadth.
1. **`VaultContext`**: The base layer. It handles the absolute path to the user's current Vault directory. If there is no Vault selected, the entire app renders a `WelcomeScreen` and nothing below this layer initializes. It also manages `VaultSettings`.
2. **`NotesContext`**: The core data layer. It hydrates the React state by calling `ipc.getProjects()` and `ipc.getNotes()` via `useNotesState`. It exposes global state variables: `notes`, `projects`, `selectedProjectId`, `selectedNoteId`, and complex setter functions.
3. **`ReviewContext`**: The Spaced Repetition layer. It relies on the vault path and note data to fetch due flashcards (`ipc.getFlashcards()`). It manages the daily flashcard queue.
4. **`UIContext`**: The ephemeral state layer. It tracks non-persistent UI states: `activeTab` ("dashboard", "project", "review"), `projectViewMode` ("toc", "editor", "graph"), sidebar widths, and modal visibility toggles.

### 5.2 Custom Hooks & Component Architecture
Rather than passing props down a dozen layers (Prop Drilling), components tap directly into these contexts via custom hooks:
- `useVaultContext()`, `useNotesContext()`, `useUIContext()`, `useReviewContext()`.
These hooks immediately throw an error if used outside their respective providers, ensuring fail-safe development.

The root component, `AppContent.tsx`, acts as the main switchboard. It observes the `activeTab` from `UIContext` and dynamically renders:
- `WelcomeScreen` (if `activeTab === "dashboard"`)
- `FlashcardReview` (if `activeTab === "review"`)
- The Split Pane UI (`LeftSidebar` | Main Content | `RightSidebar`) (if `activeTab === "project"`)

### 5.3 The Left Sidebar (`LeftSidebar.tsx`)
The Left Sidebar is technically one of the most complex components in the application. It visually renders the nested `projects` array (Books → Chapters, Courses → Modules) as an interactive, collapsible tree.
- **Drag and Drop**: Using `@dnd-kit/core`, the sidebar wraps the tree items in `SortableContext`. The `onDragEnd` handler calculates the new parent ID or new sibling index, updates the local React state instantly for snappy UI feedback, and asynchronously dispatches a `reorderProject` IPC call to persist the new order in SQLite.
- **Context Menus**: Right-clicking triggers custom dropdown menus using Tailwind/Radix primitives, allowing inline creation of new chapters or deletion of entire books.

### 5.4 The Note Editor (`NoteEditor.tsx`)
When a user clicks a note, `NoteEditor.tsx` mounts.
- **Data Fetching**: It watches `selectedNoteId`. When it changes, it triggers `ipc.getNoteContent()` to read the raw Markdown file from the disk. 
- **View vs Edit Mode**: It toggles between a raw `<textarea>` (for writing) and a `<ReactMarkdown>` rendering pane.
- **Save Debouncing**: To prevent disk thrashing, keystrokes are tracked in local state. Hitting `Cmd+S` or navigating away triggers a flush, saving the content back via IPC.

### 5.5 Command Menu (`CmdKPalette.tsx`)
Implemented via `cmdk`, this palette floats above the entire application. It indexes all titles of `notes` and `projects`. When a user types a query, it filters the array. Selecting an item dispatches `setActiveTab("project")` and `selectNote(id)`, instantly warping the user to the requested content.

---

## 6. Data Flows & Core Operations

To deeply understand Memoriser, a developer must understand exactly how data moves across the IPC bridge during critical user flows.

### 6.1 Creating a New Note
1. **Trigger**: User clicks the "+" icon next to a Chapter in the `LeftSidebar`.
2. **Frontend Action**: A modal prompts for the Note Title. Upon submission, the frontend generates a new UUID via `crypto.randomUUID()`.
3. **IPC Dispatch**: The frontend builds a `Note` object `{ id, title, project_id: chapterId, content: "" }` and calls `ipc.saveNote(vaultPath, note)`.
4. **Backend Processing**: 
   - `DbHandlers.ts` receives the object.
   - It queries the database to find the parent `Project` (the chapter) to determine the exact folder path (e.g., `docs/Books/My Book/Chapter 1/`).
   - It executes an `INSERT INTO notes` SQL query.
   - It calls `atomicWrite` to create an empty Markdown file at `/docs/Books/My Book/Chapter 1/[Title].md`.
   - It commits the file to Git.
5. **Resolution**: The IPC call returns `success: true`. The frontend locally updates the `notes` array state, bypassing the need for a full re-fetch, and sets `selectedNoteId` to the newly created UUID.

### 6.2 The Flashcard Review Algorithm Flow
1. **Data Generation**: A user highlights text in the Editor and creates a flashcard via the `RightSidebar`. The card is inserted into the `flashcards` table with default SM-2 values (`ease_factor = 2.5`, `interval = 0`).
2. **Queueing**: When the app boots, `ipc.getFlashcards()` queries the DB for cards where `next_review_date <= TODAY`. The frontend loads these into `ReviewContext`.
3. **Execution**: The user clicks "Start Review". The `FlashcardReview.tsx` component displays the front of the card. The user flips it and clicks a grade:
   - `0 (Again)`: Resets interval to 1 day. Drops ease factor by 0.2.
   - `1 (Hard)`: Multiplies current interval by 1.2. Drops ease factor by 0.15.
   - `2 (Good)`: Multiplies interval by `ease_factor`.
   - `3 (Easy)`: Multiplies interval by `ease_factor * 1.3`. Adds 0.15 to ease factor.
4. **Persistence**: The frontend calls `ipc.updateFlashcard(vaultPath, cardId, grade)`. The backend runs the exact same SM-2 mathematical mutation, updates the SQLite row with the new `next_review_date`, and returns. The frontend advances to the next card in the array.

### 6.3 Drag and Drop Reordering Flow
Reordering items requires shifting database indices.
1. **Interaction**: User drags "Chapter 2" above "Chapter 1".
2. **Frontend Logic**: `LeftSidebar` identifies that the `sort_order` of Chapter 2 must change. It calculates the new order index.
3. **IPC Call**: Sends an array of objects containing `{ id, new_sort_order }` to `ipc.reorderProjects`.
4. **Backend Processing**: `DbHandlers.ts` wraps a loop of `UPDATE projects SET sort_order = ? WHERE id = ?` inside an SQLite `BEGIN TRANSACTION` and `COMMIT` block to ensure all reordering is atomic. 
5. **Filesystem Reality Check**: Note that dragging a project *does not move the physical folders on disk* unless the parent is changed. The `sort_order` is purely a UI display mechanism handled by SQLite.

### 6.4 The "Go Live" Deployment Flow
1. **Trigger**: User clicks "Deploy to GitHub Pages" in the settings modal.
2. **Backend Config**: `ipc.generateGithubAction` is called. The Main process writes a `.github/workflows/mkdocs.yml` file into the user's Vault directory.
3. **Commit & Push**: The Main process triggers `simple-git` to add the workflow file, commit it, and execute a `git push origin main`.
4. **Remote Execution**: GitHub Actions intercepts the push, boots a Ubuntu runner, installs Python & MkDocs Material, builds the static HTML from the Vault's Markdown files, and deploys it to the `gh-pages` branch. The user's static site goes live.

---


## 7. Styling & UI Component Strategy

Memoriser strictly adheres to a utility-first styling paradigm using Tailwind CSS. We explicitly forbid external `.css` or `.scss` files for component styling to ensure that the developer can understand a component's appearance purely by reading its TSX file.

### 7.1 Tailwind Configuration & Theming
Our Tailwind theme is heavily customized via `tailwind.config.js` and CSS variables in `index.css`.
- **CSS Variables**: `src/index.css` defines HSL variables (e.g., `--background: 0 0% 100%;` and `--primary: 222.2 47.4% 11.2%;`). 
- **Dark Mode**: By applying the `.dark` class to the root `<html>` element, the CSS variables flip to dark HSL values (e.g., `--background: 222.2 84% 4.9%;`). Tailwind's `bg-background` utility automatically adapts. We do not manually write `dark:bg-slate-900` across the app; we rely on semantic color variables.
- **Radix UI Primitives**: Complex accessible components (Dialogs, Dropdowns, Tooltips) are built using Radix UI primitives. These are unstyled by default. We wrap them in reusable components in `src/components/ui/` and apply our Tailwind semantic variables.

### 7.2 The Split Pane Layout
The main interface (`AppContent.tsx`) utilizes a custom Flexbox layout to manage the Left Sidebar, Main Editor, and Right Sidebar.
- The `LeftSidebar` is fixed width (`w-64` or `w-72`).
- The Main Editor is `flex-1`, growing to consume all available horizontal space.
- Managing overflow is critical. The `LeftSidebar` uses `overflow-y-auto` to allow scrolling of the tree without pushing the entire page down. The Main Editor restricts its height to `h-screen` and applies internal scrolling to the Markdown renderer pane.
- **Pro-Tip**: If the layout breaks or pushes off-screen horizontally, check for missing `min-w-0` on flex children. Flex children cannot shrink smaller than their content by default, which often breaks text truncation.

### 7.3 Prose & Typography
When rendering user Markdown, we cannot apply Tailwind classes directly to every `<p>` or `<h1>` output by `react-markdown`.
Instead, we wrap the `react-markdown` renderer in a `div` possessing the `@tailwindcss/typography` plugin class: `prose dark:prose-invert`. This automatically applies beautiful, reading-optimized typographical scales and margins to all raw HTML elements inside it.

---

## 8. Troubleshooting Guide

When developing or debugging Memoriser, issues typically fall into three categories: IPC failures, UI state desyncs, or SQLite lockups.

### 8.1 "Note Content is Empty or Not Loading"
**Symptom**: Clicking a note in the sidebar selects it, but the editor remains blank.
**Diagnosis**: This almost always indicates a mismatch between the SQLite index and the physical file system.
1. **Check the logs**: Open `~/Library/Logs/Memoriser/main.log`. Look for `[db:getNoteContent] resolved path=...`
2. **Verify Path Construction**: In `DbHandlers.ts`, the `resolveNotePath` function queries the parent project to build the file path. If the parent project's `type` is "course", it builds `docs/Courses/...`. If the directory was manually renamed by the user to something else, `fs.readFile` will throw `ENOENT` (File not found) and return an empty string.
3. **Fix**: Run the `Git Sync` command or trigger a manual database rebuild (feature pending) to reconcile the SQLite DB with the physical disk layout.

### 8.2 "React State is Stale After Drag and Drop"
**Symptom**: Dragging a chapter updates the UI, but upon refresh, it reverts.
**Diagnosis**: The IPC call to update SQLite failed, or the local React state mutation was flawed.
1. **Check the Network/IPC tab**: Verify that the payload sent to `ipc.reorderProjects` matches the expected shape.
2. **Review `LeftSidebar.tsx`**: Ensure `onDragEnd` is correctly executing an optimistic update on the local `projects` array before dispatching the IPC call.

### 8.3 "App White Screens on Boot"
**Symptom**: The Electron window opens to a blank white screen.
**Diagnosis**: The React bundle failed to load or crashed during initial hydration.
1. **Open DevTools**: In `main.ts`, toggle `mainWindow.webContents.openDevTools()`.
2. **Check for Unhandled Context Errors**: If a hook like `useNotesState` is called outside of `AppProvider`, React will throw an unhandled exception and unmount the entire tree.
3. **Verify Vault Path**: If `config.json` contains a corrupted Vault Path, the Main process might throw an exception when trying to instantiate the SQLite connection, returning `null` to the frontend which fails to handle it gracefully.

### 8.4 Rebuilding Native Modules
**Symptom**: The app crashes with a cryptic error related to `bindings.node` or `better-sqlite3`.
**Diagnosis**: Node native modules (like SQLite) must be compiled for the exact Node/V8 version used by Electron, which often differs from the host OS Node version.
1. **Fix**: Run `npm rebuild` or use `electron-rebuild` (typically handled automatically by `electron-builder` install scripts). If working on an ARM Mac (M1/M2) and targeting Intel, ensure cross-compilation toolchains are correctly configured in `package.json`.

---

*End of Document. This technical manual represents the definitive architecture of Memoriser.*
