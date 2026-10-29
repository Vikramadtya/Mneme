import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../api/client';

const SLOW_AFTER_MS = 1500;
const MAX_DELAY_MS = 10_000;

/** Pings /health on load; if the (free-tier) backend is asleep, tells the user and keeps retrying with back-off. */
export function useServerWakeup() {
  useEffect(() => {
    let cancelled = false;
    let toastId: string | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();

    const slowTimer = setTimeout(() => {
      toastId = toast.loading('Waking up backend server... (this can take ~50s on free tier)', { duration: Infinity });
    }, SLOW_AFTER_MS);

    const check = async (delay: number) => {
      try {
        const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        clearTimeout(slowTimer);
        if (toastId && !cancelled) toast.success('Backend server is ready!', { id: toastId, duration: 4000 });
      } catch {
        if (cancelled) return;
        retry = setTimeout(() => check(Math.min(delay * 2, MAX_DELAY_MS)), delay);
      }
    };
    check(2000);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(slowTimer);
      clearTimeout(retry);
      if (toastId) toast.dismiss(toastId);
    };
  }, []);
}
