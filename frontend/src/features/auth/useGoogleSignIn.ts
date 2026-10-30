import type { CredentialResponse } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { setToken } from '../../api/auth';
import { API_BASE_URL } from '../../api/client';

/** Exchanges Google's ID token for a session, then reloads into the signed-in app. */
export function useGoogleSignIn() {
  const onSuccess = async (response: CredentialResponse) => {
    if (!response.credential) {
      toast.error('Google did not return a sign-in token. Please try again.');
      return;
    }
    const loading = toast.loading('Signing in...');
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const detail = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
        throw new Error(`${detail ?? 'Failed to login with backend'} (${res.status})`);
      }
      setToken((await res.json()).access_token);
      toast.success('Signed in', { id: loading });
      window.location.reload();
    } catch (e) {
      toast.error(`Login failed: ${e instanceof Error ? e.message : 'network error'}`, { id: loading });
    }
  };
  const onError = () => toast.error('Google sign-in was closed or failed.');
  return { onSuccess, onError };
}
