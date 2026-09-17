import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from "@sentry/react";
import App from './App'
import './index.css'

if (import.meta.env.VITE_SENTRY_DSN) {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const apiDomain = new URL(apiUrl.startsWith('http') ? apiUrl : 'http://localhost').hostname;

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: 1.0, 
    tracePropagationTargets: ["localhost", apiDomain],
    replaysSessionSampleRate: 0.1, 
    replaysOnErrorSampleRate: 1.0,
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
