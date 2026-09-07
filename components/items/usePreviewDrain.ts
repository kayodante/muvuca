"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { reschedulePreviewsForItems } from "@/lib/actions/previews";
import {
  notifyPreviewQueueChanged,
  subscribePreviewQueueChanged,
} from "@/lib/events/preview-queue";
import { PREVIEW_CLAIM_LIMIT } from "@/lib/validation/item";
import type { ActionResult } from "@/lib/utils/result";

type DrainData = {
  processed: number;
  ready: number;
  failed: number;
  /** `null` when the server-side count itself failed -- never read as
   * "queue empty". */
  remaining: number | null;
};

/**
 * Hard ceiling on rounds the global/background phase (see the hook's
 * header comment) will run in one session, regardless of how much backlog
 * remains. At `PREVIEW_CLAIM_LIMIT` (6) jobs/round this is ~300 jobs --
 * enough to meaningfully chip away at a large backlog (e.g. right after a
 * bookmark import) without one tab silently grinding on it for minutes.
 * The rest is picked up by the next mount/navigation or the next
 * `notifyPreviewQueueChanged()` wake, so the cap only bounds a single
 * session's worst case, not the total time to clear the backlog.
 */
const GLOBAL_DRAIN_ROUND_CAP = 50;

/**
 * POSTs to the drain Route Handler and normalizes the outcome to the same
 * `ActionResult` shape the old Server Action returned, so the rest of this
 * hook doesn't need to know the call is now HTTP. Never throws: a network
 * failure or a non-2xx response both collapse into a generic failure,
 * which the caller already treats as "stop this session" via
 * `if (!result.ok) return` -- exactly like a thrown Server Action used to.
 */
async function fetchDrainPreviewQueue(
  opts: { itemIds?: string[] } = {},
): Promise<ActionResult<DrainData>> {
  try {
    const response = await fetch("/api/previews/drain", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(opts),
    });
    if (!response.ok) {
      return {
        ok: false,
        code: "UNKNOWN",
        message: "Não foi possível drenar as prévias.",
      };
    }
    return (await response.json()) as ActionResult<DrainData>;
  } catch {
    return {
      ok: false,
      code: "UNKNOWN",
      message: "Não foi possível drenar as prévias.",
    };
  }
}

/**
 * Owns the client-side drain of link previews. One owner serves three
 * things: the automatic session that runs on mount / on every page, filter
 * or search change; a background sweep of the user's whole backlog once
 * the visible page is caught up; and the toolbar's "Atualizar
 * pré-visualizações" button.
 *
 * A session has two phases:
 *
 * 1. **Scoped** -- drains only the link items rendered on **this page**
 *    (`linkItemIds`). A page holds at most `PAGE_SIZE` (48) items, under
 *    `PREVIEW_SCOPE_MAX_IDS` (60), so one run of rounds always finishes
 *    the visible scope -- hence the derived round cap (`maxRounds`) and no
 *    cooldown timer. `router.refresh()` runs after every round so this
 *    page's own cards update as their previews land.
 * 2. **Global** -- once the scoped phase reports `remaining === 0`, the
 *    same endpoint is called again with no `itemIds`, draining the rest of
 *    the user's backlog (import backlog, other pages, ...). No
 *    `router.refresh()` here -- none of that work is on screen, so a
 *    refresh would just re-render for nothing; a page that later shows one
 *    of those items renders it fresh on its own mount anyway.
 *
 * Why the global phase is safe now, when it wasn't before: `link_previews`
 * is (and always was) a single global queue per user, but
 * `drainPreviewQueue` used to be a Server Action, and Server Actions are
 * serialized per client -- a background sweep of the whole queue starved
 * every *other* Server Action on the page (import, edit, search) behind
 * rounds of up to six remote fetches each. That's the entire reason this
 * hook used to scope itself to the visible page and stop there, leaving
 * the rest of the queue undrained forever. The drain call now goes through
 * `POST /api/previews/drain` (`app/api/previews/drain/route.ts`), a plain
 * Route Handler reached with `fetch()` -- outside the Server Action queue
 * entirely -- so a global sweep no longer competes with anything else the
 * client does.
 *
 * The global phase still only runs while the tab is visible and stops on
 * the same conditions as the scoped phase (failure, hidden tab, cancelled
 * session), plus its own infinite-loop guards: it stops the moment a round
 * claims nothing (`processed === 0` -- another round can't change that),
 * the moment a known `remaining` fails to shrink between rounds, or after
 * `GLOBAL_DRAIN_ROUND_CAP` rounds no matter what. `remaining === null`
 * (the server-side count itself failed) is never read as "queue empty",
 * same rule the scoped phase already followed -- but it still advances the
 * round cap, so a persistently broken count can't spin the loop forever.
 *
 * `subscribePreviewQueueChanged` (`lib/events/preview-queue.ts`) wakes a
 * stopped session without a remount: import, URL edit, the per-item
 * "Atualizar prévia" and this hook's own `refreshVisible` all funnel
 * through it. A session already in flight coalesces a mid-run wake into a
 * single follow-up session instead of a second concurrent loop; a fresh
 * wake always restarts at the scoped phase, since it means new work was
 * just enqueued for (or near) the visible page. `visibilitychange`
 * resumes a session that stopped only because the tab went hidden, picking
 * up whichever phase -- scoped or global -- was active when it stopped.
 */
export function usePreviewDrain(linkItemIds: string[]): {
  refreshVisible: () => void;
  isDraining: boolean;
} {
  const router = useRouter();
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isSessionRunning, setIsSessionRunning] = useState(false);
  // The array identity changes on every `ItemsPage` render; the joined key
  // is what actually decides whether the scope changed. Item ids are UUIDs,
  // so splitting it back inside the effect is lossless.
  const idsKey = linkItemIds.join(",");

  useEffect(() => {
    const ids = idsKey ? idsKey.split(",") : [];
    // A page with no link item has nothing to drain: no session, no
    // subscription, zero round-trips.
    if (ids.length === 0) return;

    // Derived from the same constant the drain endpoint clamps its limit
    // with, so the cap can never fall short of the page: every round claims
    // at most that many jobs, and the `+1` is the round that observes
    // `remaining === 0`.
    const maxRounds = Math.ceil(ids.length / PREVIEW_CLAIM_LIMIT) + 1;

    let cancelled = false;
    let running = false;
    let pendingWake = false;
    let round = 0;
    let scopedEmptied = false;
    let globalRound = 0;
    let previousGlobalRemaining: number | null | undefined;

    function visible() {
      return document.visibilityState !== "hidden";
    }

    /** Phase 1. Returns whether the scope was found empty
     * (`remaining === 0`), the signal to move on to the global phase. */
    async function drainScoped(): Promise<boolean> {
      while (round < maxRounds && !cancelled && visible()) {
        round++;
        const result = await fetchDrainPreviewQueue({ itemIds: ids });
        if (cancelled) return false;
        if (!result.ok) return false;

        router.refresh();

        if (result.data.remaining === 0) return true;
      }
      return false;
    }

    /** Phase 2 -- see the hook's header comment for the guards and why
     * this can safely run in the background now. */
    async function drainGlobalBacklog(): Promise<void> {
      while (globalRound < GLOBAL_DRAIN_ROUND_CAP && !cancelled && visible()) {
        globalRound++;
        const result = await fetchDrainPreviewQueue();
        if (cancelled) return;
        if (!result.ok) return;

        const { processed, remaining } = result.data;
        if (processed === 0) return;
        if (remaining === 0) return;
        if (remaining !== null) {
          if (
            previousGlobalRemaining !== undefined &&
            previousGlobalRemaining !== null &&
            remaining >= previousGlobalRemaining
          ) {
            return;
          }
          previousGlobalRemaining = remaining;
        }
        // remaining === null: keep going (bounded by the round cap above)
        // rather than guessing either way.
      }
    }

    async function runSession(freshBudget = false) {
      if (running) {
        // A wake arrived mid-session -- coalesce it into one follow-up
        // session once the current one finishes, rather than running two
        // drain loops at once.
        pendingWake = true;
        return;
      }
      // Only a session that actually starts gets a new round budget -- a
      // wake arriving mid-session must not extend the running loop past
      // the cap (it already queued itself through `pendingWake`).
      if (freshBudget) {
        round = 0;
        scopedEmptied = false;
        globalRound = 0;
        previousGlobalRemaining = undefined;
      }
      running = true;
      setIsSessionRunning(true);
      try {
        if (!scopedEmptied) {
          scopedEmptied = await drainScoped();
        }
        if (scopedEmptied && !cancelled && visible()) {
          await drainGlobalBacklog();
        }
      } finally {
        running = false;
        if (pendingWake && !cancelled) {
          pendingWake = false;
          void runSession(true);
        } else if (!cancelled) {
          // Guarded: once this effect is cancelled the flag belongs to the
          // session the next effect started, and a late-resolving round
          // from this one must not clear it. The cleanup below owns the
          // reset for the cancelled session.
          setIsSessionRunning(false);
        }
      }
    }

    function handleVisibilityChange() {
      // Resumes whichever phase was active when the tab went hidden: it
      // didn't add work, it only postponed it.
      if (document.visibilityState === "visible") void runSession();
    }

    function handleQueueChanged() {
      void runSession(true);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    const unsubscribe = subscribePreviewQueueChanged(handleQueueChanged);
    void runSession();

    return () => {
      cancelled = true;
      // This session is over. On unmount the setState is a no-op; on a
      // scope change the next effect immediately sets the flag again (or
      // leaves it off, when the new page has no link at all).
      setIsSessionRunning(false);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsubscribe();
    };
  }, [idsKey, router]);

  /** Toolbar action: re-queue this page's previews, then drain them. The
   * drain is woken through `notifyPreviewQueueChanged()` -- the same channel
   * the per-item refresh uses -- so the session loop stays the effect's. */
  async function refreshVisible() {
    setIsRescheduling(true);
    try {
      const result = await reschedulePreviewsForItems(linkItemIds);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const { rescheduled } = result.data;
      if (rescheduled === 0) {
        toast("Nenhuma prévia pendente nesta página.");
        return;
      }
      toast.success(
        rescheduled === 1
          ? "1 prévia será atualizada."
          : `${rescheduled} prévias serão atualizadas.`,
      );
      notifyPreviewQueueChanged();
    } catch {
      // A thrown action (network down, expired session) needs the same
      // error state as an `ok: false` result -- and never leaks the raw
      // error to the user.
      toast.error("Não foi possível atualizar as prévias.");
    } finally {
      setIsRescheduling(false);
    }
  }

  return { refreshVisible, isDraining: isRescheduling || isSessionRunning };
}
