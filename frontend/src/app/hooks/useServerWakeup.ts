import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../api/client';

export function useServerWakeup() {
  const toastId = useRef<string | null>(null);
  const isChecking = useRef(false);

  useEffect(() => {
    if (isChecking.current) return;
    isChecking.current = true;

    const checkHealth = async () => {
      // Start a timeout to show the toast if the server takes more than 1 second to respond
      const slowServerTimeout = setTimeout(() => {
        toastId.current = toast.loading('Waiting for backend server to wake up... (this can take ~50s on free tier)', {
          duration: Infinity, // Keep it open until we dismiss it
        });
      }, 1500);

      try {
        const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
        clearTimeout(slowServerTimeout);
        
        if (res.ok) {
          if (toastId.current) {
            toast.success('Backend server is ready!', { id: toastId.current });
            toastId.current = null;
          }
        } else {
           throw new Error('Not ok');
        }
      } catch (error) {
        clearTimeout(slowServerTimeout);
        pollHealth();
      }
    };

    const pollHealth = () => {
      if (!toastId.current) {
        toastId.current = toast.loading('Waking up backend server... (this can take ~50s on free tier)', {
          duration: Infinity,
        });
      }

      const interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
          if (res.ok) {
            clearInterval(interval);
            toast.success('Backend server is ready!', { id: toastId.current! });
            toastId.current = null;
          }
        } catch (e) {
          // Still waiting...
        }
      }, 5000);
    };

    checkHealth();
  }, []);
}
