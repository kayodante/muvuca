"use client";

import { useEffect, useState } from "react";
import { Link2Off } from "lucide-react";
import type { PreviewSummary } from "@/lib/database/queries/previews";
import { cn } from "@/lib/utils";
import { getDomainMonogram } from "./SiteIdentity";

/**
 * Error codes that mean the resource itself is confirmed gone (404/410) or
 * unresolvable (DNS) -- as opposed to `http_error`, which also covers a
 * site that is alive and simply blocking bots (403 from Medium, GitHub,
 * etc.) and must keep showing the neutral "no preview" monogram, not a
 * broken-link state.
 */
const BROKEN_LINK_ERROR_CODES = new Set([
  "http_not_found",
  "http_gone",
  "dns_failure",
]);

/** Same-origin preview image URL -- never a remote host. */
export function previewImageSrc(
  itemId: string,
  kind: "thumb" | "icon",
  hash: string,
): string {
  return `/api/previews/${itemId}/${kind}?v=${hash}`;
}

/**
 * Media area at the top of a link `ItemCard` -- 365:172, not 16:9: captured
 * thumbnails are 16:9 and get cropped top/bottom by `object-cover` by
 * design. Covers 5 states: ready (thumbnail), pending (neutral skeleton, no
 * spinner), failed with a confirmed-dead error code (broken-link icon, see
 * `BROKEN_LINK_ERROR_CODES`), failed/no-image for every other reason
 * (domain monogram, no visible error text), and a client-side `onError` on
 * the `<img>` itself (stale/removed object, 401, 404) falling back to the
 * same monogram. The card stays 100% usable without an image either way --
 * this is a bonus, never a dependency for legibility.
 */
export function LinkPreviewMedia({
  itemId,
  domain,
  preview,
}: {
  itemId: string;
  domain: string;
  preview: PreviewSummary | null;
}) {
  const [broken, setBroken] = useState(false);
  const pending = !broken && preview?.status === "pending";
  const [revealed, setRevealed] = useState(!pending);
  const [wasPending, setWasPending] = useState(pending);
  // A stale `broken` flag must not keep hiding a thumbnail that just got
  // replaced by a newer, valid one: once the identity of
  // the asset behind the URL changes, any previous <img> error is moot.
  // Adjusted during render (React's own pattern for resetting state when a
  // prop changes) rather than in an effect, which would flash the old
  // fallback for one extra render before catching up.
  const [lastThumbnailHash, setLastThumbnailHash] = useState(
    preview?.thumbnailHash ?? null,
  );
  if ((preview?.thumbnailHash ?? null) !== lastThumbnailHash) {
    setLastThumbnailHash(preview?.thumbnailHash ?? null);
    setBroken(false);
  }
  if (pending !== wasPending) {
    setWasPending(pending);
    if (pending) setRevealed(false);
  }

  useEffect(() => {
    if (pending) return;
    const frame = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(frame);
  }, [pending]);

  const content =
    !broken && preview?.status === "ready" && preview.thumbnailHash ? (
      <div className="h-full w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- image is already processed and served from same-origin */}
        <img
          src={previewImageSrc(itemId, "thumb", preview.thumbnailHash)}
          alt=""
          aria-hidden="true"
          width={640}
          height={360}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      </div>
    ) : pending ? null : preview?.status === "failed" &&
      preview.errorCode !== null &&
      BROKEN_LINK_ERROR_CODES.has(preview.errorCode) ? (
      <div
        aria-hidden="true"
        title="Link indisponível"
        className="flex h-full w-full items-center justify-center bg-secondary/40"
      >
        <Link2Off className="size-6 text-muted-foreground" />
      </div>
    ) : (
      <PreviewFallback domain={domain} />
    );

  return (
    <div
      data-state={pending ? "loading" : "ready"}
      className={cn(
        "t-skel aspect-[365/172] w-full border-b border-border",
        revealed && "is-revealed",
        pending && "is-resetting",
      )}
    >
      <div className={cn("t-skel-skeleton", pending && "is-pulsing")}>
        <span className="block h-full w-full bg-secondary" />
      </div>
      <div className="t-skel-content">{content}</div>
    </div>
  );
}

function PreviewFallback({ domain }: { domain: string }) {
  const { letter, swatchClass, textClass } = getDomainMonogram(domain);
  return (
    <div
      aria-hidden="true"
      title="Prévia indisponível"
      className="flex h-full w-full items-center justify-center bg-secondary/40"
    >
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-full text-lg font-semibold",
          swatchClass,
          textClass,
        )}
      >
        {letter}
      </span>
    </div>
  );
}
