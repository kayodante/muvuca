/**
 * Wakes `usePreviewDrain` when a client flow enqueues/reschedules preview
 * jobs (import, URL edit, manual refresh) after the hook already found
 * the queue empty and stopped looping. No server-only import here --
 * every caller is a client component reacting to an already-resolved
 * `ActionResult`.
 */
type Listener = () => void;

const listeners = new Set<Listener>();

export function notifyPreviewQueueChanged(): void {
  for (const listener of listeners) listener();
}

export function subscribePreviewQueueChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
