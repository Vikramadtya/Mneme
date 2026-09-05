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
npm install
npm run start:dev
\`\`\`

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
- **Infrastructure Layer:** Mongoose Schemas and Hooks.
