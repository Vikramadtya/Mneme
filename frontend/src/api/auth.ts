const TOKEN_KEY = 'access_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('isAuthenticated'); // legacy flag from before tokens were verified
  } catch {
    // storage unavailable
  }
}

/** Client-side expiry check only (UX); the server is the one that actually verifies the token. */
export function isSignedIn(): boolean {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function signOut() {
  clearToken();
  window.location.assign('/');
}
