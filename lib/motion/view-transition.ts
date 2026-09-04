import { flushSync } from "react-dom";

/**
 * View Transitions plumbing for the one authored motion moment in the app:
 * a prompt card growing into its detail dialog -- motion here explains
 * relationship, it does not decorate.
 *
 * The pairing rule the API enforces is that a `view-transition-name` must be
 * unique in the document at snapshot time. So the name lives on the card for
 * the "before" snapshot and on the dialog for the "after" one, and the two
 * commits have to be separated by a synchronous flush -- hence `prepare`
 * running outside the transition callback and `commit` running inside it.
 *
 * The paired CSS lives in `app/globals.css` under `::view-transition-*`.
 */

/**
 * Shared-element names, applied as utility classes rather than inline
 * styles. Both names are constants, so there is nothing an attribute would
 * buy beyond a wider CSP surface (`lib/security/headers.ts`). The paired
 * `::view-transition-*` rules live in `globals.css`.
 */
export const MORPH_CLASS = "[view-transition-name:muvuca-item]";
/** The title travels on its own name so it glides instead of cross-fading. */
export const MORPH_TITLE_CLASS = "[view-transition-name:muvuca-item-title]";

function canAnimate(): boolean {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return false;
  }
  // Typed as always present by the DOM lib, absent in Firefox and in jsdom.
  if (typeof document.startViewTransition !== "function") return false;
  // Reduced motion drops the travel, not the state change --
  // the dialog still opens, it just does not fly there.
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Applies `commit` as a shared-element transition when the browser and the
 * user's motion preference both allow it, and as a plain state update
 * otherwise. `prepare` tags the outgoing element and only runs on the
 * animated path, because there is nothing to tag without a transition.
 */
export function morph(prepare: () => void, commit: () => void): void {
  if (!canAnimate()) {
    commit();
    return;
  }

  const root = document.documentElement;

  flushSync(prepare);
  root.dataset.viewTransition = "";

  const transition = document.startViewTransition(() => flushSync(commit));
  // `finished` rejects when a transition is skipped (a second one starting,
  // or the tab going hidden). Either way the attribute has to come off, or
  // every later dialog would open with its own entrance suppressed.
  void transition.finished
    .catch(() => {})
    .finally(() => {
      delete root.dataset.viewTransition;
    });
}
