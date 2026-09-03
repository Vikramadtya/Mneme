import { QueryProvider } from './app/providers/QueryProvider'
import { AppRouter } from './app/router/AppRouter'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Toaster } from 'react-hot-toast'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'mock-client-id';

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryProvider>
        <Toaster position="top-center" toastOptions={{ duration: 4000, style: { background: '#334155', color: '#fff', borderRadius: '9999px', padding: '12px 24px', fontWeight: 'bold' } }} />
        <AppRouter />
      </QueryProvider>
    </GoogleOAuthProvider>
  )
}
