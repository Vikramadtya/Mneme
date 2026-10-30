import { ApiError, fetchApi } from '../../api/client';
import type { ReviewMode } from './api';

/** Reviews that could not reach the server (offline or flaky), replayed in order once it is reachable. */
const KEY = 'memoriser.reviewQueue';
const MAX_QUEUED = 500;

export interface QueuedReview {
  wordId: string;
  grade: number;
  mode?: ReviewMode;
  at: string;
}

function read(): QueuedReview[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

function write(queue: QueuedReview[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(queue.slice(-MAX_QUEUED)));
  } catch {
    /* storage full or blocked: the review is lost only if the network is also down */
  }
  window.dispatchEvent(new Event('memoriser:queue'));
}

export const queuedCount = () => read().length;

const isNetworkFailure = (e: unknown) => !(e instanceof ApiError);

const post = (r: QueuedReview) =>
  fetchApi(`/learning/${r.wordId}/review`, { method: 'POST', body: JSON.stringify({ grade: r.grade, mode: r.mode, at: r.at }) });

/** Sends a review, or queues it when the network is down. Resolves to true when it reached the server. */
export async function sendReview(review: Omit<QueuedReview, 'at'>): Promise<boolean> {
  const full = { ...review, at: new Date().toISOString() };
  if (queuedCount() === 0) {
    try {
      await post(full);
      return true;
    } catch (e) {
      if (!isNetworkFailure(e)) throw e;
    }
  }
  write([...read(), full]); // keep order: nothing jumps ahead of reviews that are still waiting
  void flushQueue();
  return false;
}

let flushing = false;
export async function flushQueue(): Promise<number> {
  if (flushing || !navigator.onLine) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (;;) {
      const [next] = read();
      if (!next) break;
      try {
        await post(next);
      } catch (e) {
        if (isNetworkFailure(e)) break; // still offline; try again later
        // The server rejected it for good (e.g. the word was deleted), so drop it instead of blocking the rest.
      }
      write(read().slice(1));
      sent += 1;
    }
  } finally {
    flushing = false;
  }
  return sent;
}

/** Removes a not-yet-sent review of this word; returns true if there was one. */
export function dropQueued(wordId: string): boolean {
  const queue = read();
  const index = queue.map((r) => r.wordId).lastIndexOf(wordId);
  if (index === -1) return false;
  queue.splice(index, 1);
  write(queue);
  return true;
}

export function startQueueSync(onFlushed: () => void) {
  const run = () => void flushQueue().then((n) => n && onFlushed());
  window.addEventListener('online', run);
  run();
  return () => window.removeEventListener('online', run);
}
