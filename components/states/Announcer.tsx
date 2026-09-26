"use client";

const pendingMessages: string[] = [];
let announcing = false;

/** Announce every copy, including repeated messages, without a visible toast. */
export function announce(message: string): void {
  pendingMessages.push(message);
  if (announcing) return;
  announcing = true;

  function next() {
    // Modal dialogs hide the rest of the page from assistive technology.
    const status =
      document.querySelector<HTMLElement>(
        '[role="dialog"] [data-copy-announcer]',
      ) ?? document.querySelector<HTMLElement>("[data-copy-announcer]");
    const current = pendingMessages.shift();
    if (!status || !current) {
      pendingMessages.length = 0;
      announcing = false;
      return;
    }

    status.textContent = "";
    requestAnimationFrame(() => {
      status.textContent = current;
      if (pendingMessages.length) requestAnimationFrame(next);
      else announcing = false;
    });
  }

  next();
}

export function Announcer() {
  return <div data-copy-announcer role="status" className="sr-only" />;
}
