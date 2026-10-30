import { useCallback, useEffect, useSyncExternalStore } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';
const KEY = 'memoriser.theme';

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

const listeners = new Set<() => void>();
const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export function applyTheme(choice: ThemeChoice = read()) {
  const dark = choice === 'dark' || (choice === 'system' && !!media?.matches);
  document.documentElement.classList.toggle('dark', dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b0d14' : '#f6f7fb');
}

export function setThemeChoice(choice: ThemeChoice) {
  try {
    if (choice === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    /* storage can be blocked; the theme still applies for this visit */
  }
  applyTheme(choice);
  listeners.forEach((l) => l());
}

export function useTheme() {
  const choice = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => 'system' as ThemeChoice,
  );

  useEffect(() => {
    const onChange = () => choice === 'system' && applyTheme('system');
    media?.addEventListener('change', onChange);
    return () => media?.removeEventListener('change', onChange);
  }, [choice]);

  const cycle = useCallback(() => {
    const dark = document.documentElement.classList.contains('dark');
    setThemeChoice(dark ? 'light' : 'dark');
  }, []);
  return { choice, setChoice: setThemeChoice, cycle };
}
