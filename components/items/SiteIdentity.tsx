"use client";

import { useState } from "react";
import { swatchClassFor, swatchTextClassFor } from "@/lib/tags/colors";
import { TAG_COLOR_TOKENS } from "@/lib/validation/tag";
import { cn } from "@/lib/utils";

/**
 * Deterministic 1-letter monogram for a domain: same swatch/letter every
 * time for the same hostname, picked from the existing tag palette via a
 * simple sum-of-code-points hash -- never a new color.
 */
export function getDomainMonogram(domain: string) {
  const bare = domain.replace(/^www\./i, "");
  const letter = (bare[0] ?? "?").toUpperCase();
  const codePointSum = Array.from(bare).reduce(
    (sum, char) => sum + (char.codePointAt(0) ?? 0),
    0,
  );
  const token = TAG_COLOR_TOKENS[codePointSum % TAG_COLOR_TOKENS.length]!;
  return {
    letter,
    swatchClass: swatchClassFor(token),
    textClass: swatchTextClassFor(token),
  };
}

/**
 * Micro-row identity for a link card: the
 * real favicon when the preview pipeline captured one, otherwise the
 * domain's monogram. Both are decorative -- the card's accessible name
 * comes from its title, not this icon.
 */
export function SiteIdentity({
  domain,
  faviconSrc,
}: {
  domain: string;
  faviconSrc: string | null;
}) {
  const [broken, setBroken] = useState(false);
  // Same reasoning as LinkPreviewMedia: a stale `broken` flag must not keep
  // hiding a favicon that just got replaced by a newer, valid one. Adjusted
  // during render rather than in an effect (see LinkPreviewMedia).
  const [lastFaviconSrc, setLastFaviconSrc] = useState(faviconSrc);
  if (faviconSrc !== lastFaviconSrc) {
    setLastFaviconSrc(faviconSrc);
    setBroken(false);
  }

  if (faviconSrc && !broken) {
    return (
      <img
        src={faviconSrc}
        alt=""
        aria-hidden="true"
        className="size-4 shrink-0 rounded-[2px]"
        onError={() => setBroken(true)}
      />
    );
  }

  const { letter, swatchClass, textClass } = getDomainMonogram(domain);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "text-metadata flex size-4 shrink-0 items-center justify-center rounded-[2px] leading-none font-semibold",
        swatchClass,
        textClass,
      )}
    >
      {letter}
    </span>
  );
}
