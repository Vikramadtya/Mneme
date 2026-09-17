# Memoriser Deployment Guide

This guide details how to deploy the Memoriser application across three specialized platforms: **Vercel** (Frontend), **Render** (Backend), and **MongoDB Atlas** (Database).

## Overview
- **Database:** MongoDB Atlas (Cloud-hosted NoSQL)
- **Backend API:** Render (Node.js/NestJS Web Service)
- **Frontend App:** Vercel (React/Vite SPA)

---

## 1. Database: MongoDB Atlas
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new **Free Shared Cluster** (M0).
3. Under **Security > Database Access**, create a new database user and securely store the password.
4. Under **Security > Network Access**, click **Add IP Address** and choose "Allow Access from Anywhere" (`0.0.0.0/0`) so Render can connect to it.
5. Click **Connect > Drivers** and copy your Connection String (it will look like `mongodb+srv://<username>:<password>@cluster0...`).
6. Replace `<username>` and `<password>` with your credentials. **Save this URI.**

---

## 2. Backend API: Render
1. Create a free account at [Render](https://render.com/) and connect your GitHub account.
2. Click **New > Web Service** and select your `memoriser` GitHub repository.
3. Configure the service:
   - **Name:** `memoriser-api`
   - **Root Directory:** `backend` (Crucial!)
   - **Environment:** `Docker` (Render will automatically use Node.js). Use `Node` environment.
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start:prod`
4. **Environment Variables:**
   - Add `MONGO_URI` and paste the MongoDB connection string from Step 1.
   - Add `memoriser.auth.mock-user-id` = `0000-0000-0000-0000` (or leave it out to use the default).
5. Click **Create Web Service**. 
6. Render will build and deploy your API. Once live, copy the public URL (e.g., `https://memoriser-api.onrender.com`).

---

## 3. Frontend App: Vercel
1. Create a free account at [Vercel](https://vercel.com/) and connect your GitHub account.
2. Click **Add New > Project** and import your `memoriser` repository.
3. Configure the project:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend` (Crucial!)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Environment Variables:**
   - Add `VITE_API_URL` and set it to your Render backend URL **plus `/api/v1`** (e.g., `https://memoriser-api.onrender.com/api/v1`).
5. Click **Deploy**. Vercel will build and host your frontend on a global CDN.

---

## 4. GitHub Actions (CI)
We have added automated Continuous Integration (CI) workflows in `.github/workflows/`.
Every time you push code to `main` or open a Pull Request:
1. `ci-frontend.yml`: Verifies the React code compiles without TypeScript errors.
2. `ci-backend.yml`: Compiles the NestJS backend to ensure no build failures.

*Note: You do not need GitHub Actions for the actual Deployment. Vercel and Render natively integrate with GitHub and will automatically deploy whenever code is pushed to `main`.*


---

## 5. Observability & Tracing (Free Tier via Sentry)
The application has been fully instrumented with end-to-end distributed tracing, performance metrics, and error logging using **Sentry**. When a user clicks a button on the frontend, a unique Trace ID is generated and passed down through the API to the backend database queries, allowing you to see the complete lifecycle of any user action.

This is 100% free using Sentry's Developer tier (10k errors, 10k traces, and session replays free per month). 

**Setup Instructions:**
1. Create a free account at [Sentry.io](https://sentry.io/).
2. Create two projects: one for **React** (Frontend) and one for **Node.js** (Backend).
3. Sentry will give you a unique `DSN` URL for both projects.

**Configuration:**
If these environment variables are missing, the application will simply disable tracing and gracefully fall back to standard console logging without crashing.

*   **Frontend (Vercel):** Add `VITE_SENTRY_DSN` to your Vercel Environment Variables.
*   **Backend (Render):** Add `SENTRY_DSN` to your Render Environment Variables. 

*Note: The backend also runs a custom `LoggerInterceptor` that injects the Sentry Trace ID into your standard Render stdout logs. This means even if you don't use the Sentry dashboard, your Render logs will look like `[Trace: e4a3b2...] GET /api/v1/learning/dashboard-overview 200 - 45ms`.*
