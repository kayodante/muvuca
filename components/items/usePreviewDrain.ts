"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  drainPreviewQueue,
  reschedulePreviewsForItems,
} from "@/lib/actions/previews";
import {
  notifyPreviewQueueChanged,
  subscribePreviewQueueChanged,
} from "@/lib/events/preview-queue";
import { PREVIEW_CLAIM_LIMIT } from "@/lib/validation/item";

/**
 * Owns the client-side drain of link previews for the items **currently
 * rendered on this page**. One owner serves both triggers:
 * the automatic session that runs on mount / on every page, filter or
 * search change, and the toolbar's "Atualizar pré-visualizações" button.
 *
 * Why page-scoped: the queue in `link_previews` is still global per user,
 * but sweeping all of it from the browser starves every other Server Action
 * of the same client (they are serialized through the router queue), which
 * is what made a large bookmark import look frozen while each drain round
 * spent up to six remote fetches with timeouts. A page holds at most
 * `PAGE_SIZE` (48) items, under `PREVIEW_SCOPE_MAX_IDS` (60), so one
 * session always finishes the visible scope -- hence a derived round cap
 * and no cooldown timer. Jobs for items nobody is looking at simply wait
 * until a page that shows them is rendered (or the button reschedules
 * them).
 *
 * A session stops when the queue reports `remaining === 0` for this scope,
 * the action fails, the round cap is reached, or the tab goes hidden --
 * draining previews nobody is looking at buys nothing. `visibilitychange`
 * resumes from where the round counter left off.
 *
 * `subscribePreviewQueueChanged` (`lib/events/preview-queue.ts`) wakes a
 * stopped session without a remount: import, URL edit, the per-item
 * "Atualizar prévia" and this hook's own `refreshVisible` all funnel
 * through it. A session already in flight coalesces a mid-run wake into a
 * single follow-up session instead of a second concurrent loop.
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

    // Derived from the same constant `drainPreviewQueue` clamps its limit
    // with, so the cap can never fall short of the page: every round claims
    // at most that many jobs, and the `+1` is the round that observes
    // `remaining === 0`.
    const maxRounds = Math.ceil(ids.length / PREVIEW_CLAIM_LIMIT) + 1;

    let cancelled = false;
    let running = false;
    let pendingWake = false;
    let round = 0;

    async function drainWhileVisible(freshBudget = false) {
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
      if (freshBudget) round = 0;
      running = true;
      setIsSessionRunning(true);
      try {
        while (
          round < maxRounds &&
          !cancelled &&
          document.visibilityState !== "hidden"
        ) {
          round++;
          const result = await drainPreviewQueue({ itemIds: ids });
          if (cancelled) return;
          if (!result.ok) return;

          router.refresh();

          if (result.data.remaining === 0) return;
        }
      } finally {
        running = false;
        if (pendingWake && !cancelled) {
          pendingWake = false;
          void drainWhileVisible(true);
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
      // Resumes where the round counter left off: the tab being hidden
      // didn't add work, it only postponed it.
      if (document.visibilityState === "visible") void drainWhileVisible();
    }

    function handleQueueChanged() {
      void drainWhileVisible(true);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    const unsubscribe = subscribePreviewQueueChanged(handleQueueChanged);
    void drainWhileVisible();

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
