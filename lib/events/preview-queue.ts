/**
 * Wakes `usePreviewDrain` when a client flow enqueues/reschedules preview
 * jobs (import, URL edit, manual refresh) after the hook already found
 * the queue empty and stopped looping. No server-only import here --
 * every caller is a client component reacting to an already-resolved
 * `ActionResult`.
 */
const CHANGED = "preview-queue-changed";

const target = new EventTarget();

export function notifyPreviewQueueChanged(): void {
  target.dispatchEvent(new Event(CHANGED));
}

export function subscribePreviewQueueChanged(listener: () => void): () => void {
  const controller = new AbortController();
  target.addEventListener(CHANGED, listener, { signal: controller.signal });
  return () => controller.abort();
}
