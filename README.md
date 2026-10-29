# Memoriser

A highly scalable spaced-repetition flashcard application.

## Tech Stack
- **Frontend:** React, Vite, TailwindCSS, React Query, Recharts
- **Backend:** NestJS (TypeScript), Mongoose, MongoDB Atlas
- **External APIs:** Datamuse (Dictionary)

## Getting Started

### Prerequisites
- Node.js (v20+)
- MongoDB connection string

### Running the Backend
\`\`\`bash
cd backend
cp .env.example .env   # then fill in MONGO_URI, JWT_SECRET and GOOGLE_CLIENT_ID
npm install
npm run start:dev
npm test               # unit + end-to-end tests (in-memory MongoDB, no setup needed)
\`\`\`

A local MongoDB can be started with \`MONGO_PASSWORD=... docker compose up -d\` (bound to localhost only).

A local MongoDB can be started with `MONGO_PASSWORD=... docker compose up -d` (bound to localhost only).

### Running the Frontend
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

## Architecture
This application strictly follows Domain-Driven Design (DDD) and SOLID principles:
- **Presentation Layer:** Controllers exposing RESTful endpoints.
- **Application Layer:** Services orchestrating business logic (SpacedRepetitionService).
- **Domain Layer:** Pure interfaces/classes for entities.
- **Infrastructure Layer:** Mongoose Schemas and indexes.
