import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../api/client';

export interface Settings {
  dailyGoal: number;
  reminderHour: number | null;
  timezone: string;
  pushEnabled: boolean;
  vapidPublicKey: string | null;
  aiEnabled: boolean;
}

export function useSettings() {
  return useQuery<Settings>({ queryKey: ['settings'], queryFn: () => fetchApi('/settings'), staleTime: 5 * 60_000 });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Pick<Settings, 'dailyGoal' | 'reminderHour' | 'timezone'>>) =>
      fetchApi<Settings>('/settings', { method: 'PUT', body: JSON.stringify(patch) }),
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

const urlBase64ToUint8Array = (base64: string) => {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
};

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export async function enablePush(vapidPublicKey: string): Promise<Settings> {
  if (!pushSupported()) throw new Error('This browser does not support notifications.');
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('Notifications were blocked for this site.');
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) }));
  return fetchApi<Settings>('/settings/push', { method: 'POST', body: JSON.stringify(subscription.toJSON()) });
}

export async function disablePush(): Promise<Settings> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  const endpoint = subscription?.endpoint ?? '';
  await subscription?.unsubscribe();
  return fetchApi<Settings>('/settings/push', { method: 'DELETE', body: JSON.stringify({ endpoint }) });
}
