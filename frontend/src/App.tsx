import { useEffect } from 'react'
import { QueryProvider } from './app/providers/QueryProvider'
import { AppRouter } from './app/router/AppRouter'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Toaster } from 'react-hot-toast'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { applyTheme } from './ui/theme'
import { useServerWakeup } from './app/hooks/useServerWakeup'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'mock-client-id';

export default function App() {
  useServerWakeup();
  useEffect(() => applyTheme(), []);
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: { background: 'var(--surface)', color: 'var(--fg)', border: '1px solid var(--line)', borderRadius: '9999px', padding: '10px 20px', fontWeight: 600, boxShadow: 'var(--shadow-lg)' },
          }}
        />
        <AppRouter />
        <Analytics />
        <SpeedInsights />
      </QueryProvider>
    </GoogleOAuthProvider>
  )
}
