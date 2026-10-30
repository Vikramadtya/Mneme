import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from "@sentry/react";
import App from './App'
import './index.css'

if (import.meta.env.VITE_SENTRY_DSN) {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const apiDomain = new URL(apiUrl.startsWith('http') ? apiUrl : 'http://localhost').hostname;
  const sampleRate = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1);

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      // Vocabulary and notes are personal; never record them in clear text.
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    tracesSampleRate: sampleRate,
    tracePropagationTargets: ["localhost", apiDomain],
    replaysSessionSampleRate: 0.1, 
    replaysOnErrorSampleRate: 1.0,
  });
}

// Offline support and push notifications live in the service worker; it is only useful on the built site.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
