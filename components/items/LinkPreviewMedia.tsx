"use client";

import { useState } from "react";
import type { PreviewSummary } from "@/lib/database/queries/previews";
import { cn } from "@/lib/utils";
import { getDomainMonogram } from "./SiteIdentity";

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
 * design. Covers 4 states: ready (thumbnail), pending (neutral skeleton, no
 * spinner), failed/no-image (domain monogram, no visible error text), and a
 * client-side `onError` on the `<img>` itself (stale/removed object, 401,
 * 404) falling back to the same monogram. The card stays 100% usable
 * without an image either way -- this is a bonus, never a dependency for
 * legibility.
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

  if (!broken && preview?.status === "ready" && preview.thumbnailHash) {
    return (
      <>
        <div className="aspect-[365/172] w-full overflow-hidden border-b border-border">
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
      </>
    );
  }

  if (!broken && preview?.status === "pending") {
    return (
      <div
        aria-hidden="true"
        className="aspect-[365/172] w-full border-b border-border bg-secondary motion-safe:animate-pulse"
      />
    );
  }

  const { letter, swatchClass, textClass } = getDomainMonogram(domain);
  return (
    <div
      aria-hidden="true"
      title="Prévia indisponível"
      className="flex aspect-[365/172] w-full items-center justify-center border-b border-border bg-secondary/40"
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
