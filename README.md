# Memoriser

A spaced-repetition vocabulary app: add words, review them with a scheduler that adapts to how you remember, and keep a streak.

## Features
- **FSRS scheduling**: the modern spaced-repetition model decides when each word returns (existing progress from the old SM-2 scheduler is upgraded in place).
- **Four review modes**: flip, reverse, type the answer, fill in the blank. Keyboard shortcuts (Space, 1-4, Z to undo, P to pronounce) and swipe gestures on touch screens.
- **Auto-fill**: definitions, examples, synonyms and recorded pronunciation from a dictionary; browser speech as a fallback.
- **Bulk add**: paste a list or import CSV / TSV / Anki text exports.
- **Collections**: group words, study one collection, share a collection by link (others can import a copy).
- **Streaks, daily goal and a year-long review calendar**, plus charts under Insights.
- **Leech detection**: words you keep forgetting are flagged.
- **Installable and offline-friendly (PWA)**: the app shell and recent study data are cached, and reviews made offline sync later.
- **Reminders**: optional daily push notification when words are due.
- **AI suggestions** (optional): example sentences, a mnemonic and synonyms when adding a word.
- Light and dark themes, command palette (Ctrl/Cmd+K), backup export and restore.

## Tech stack
- **Frontend:** React, Vite, Tailwind CSS 4, React Query, Recharts
- **Backend:** NestJS (TypeScript), Mongoose, MongoDB
- **External APIs:** dictionaryapi.dev and Datamuse (dictionary), Google Sign-In, optionally Anthropic (AI suggestions)

## Getting started

Prerequisites: Node.js 20+ and a MongoDB connection string.

### Backend
```bash
cd backend
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET and GOOGLE_CLIENT_ID
npm install
npm run start:dev
npm test               # unit + end-to-end tests (in-memory MongoDB, no setup needed)
```

A local MongoDB can be started with `MONGO_PASSWORD=... docker compose up -d` (bound to localhost only).

### Frontend
```bash
cd frontend
npm install
npm run dev
npm test
```

## Architecture
- **Controllers** expose the REST API under `/api/v1`; all routes require a session token except health, public shared collections and the reminder dispatcher.
- **Services** hold the logic (scheduling in `SpacedRepetitionService`, sharing in `SharingService`, reminders in `ReminderService`).
- **Mongoose schemas** define the data and its indexes. A background repair pass (`DataIntegrityService`) cleans data left by older versions on startup.

See [deployment.md](deployment.md) for hosting and the optional features (reminders, AI suggestions).
