import { cn } from "@/lib/utils";

/**
 * Ancestor trail ("A / B / Pai /"), root-first, truncating from the
 * *start* so the immediate parent -- what actually disambiguates a tag
 * from a same-named one elsewhere -- never disappears. `title` carries the
 * full path for a pointer tooltip. Shared by the parent picker's option
 * list, the filter's flat results, and the compact column header's trail.
 *
 * Truncation trick: a `[direction:rtl]` container moves the browser's own
 * ellipsis to the left edge, so the tail (closest to the visible tag)
 * stays put and the root end gives way first. The names themselves are
 * plain LTR text, isolated in a `<bdi dir="ltr">`: without it, a name
 * ending in weak/neutral punctuation ("C++", "(beta)") gets reordered by
 * the surrounding RTL run and the punctuation lands on the wrong side.
 */
export function AncestorPath({
  names,
  className,
  "aria-hidden": ariaHidden,
}: {
  /** Root-first ancestor names, not including the tag's own name. */
  names: string[];
  className?: string;
  "aria-hidden"?: boolean;
}) {
  if (names.length === 0) return null;

  const immediateParent = names.at(-1)!;
  const earlierAncestors = names.slice(0, -1);

  return (
    <span
      dir="auto"
      title={names.join(" / ")}
      aria-hidden={ariaHidden}
      className={cn("flex min-w-0 items-center overflow-hidden", className)}
    >
      {earlierAncestors.length > 0 && (
        <span className="min-w-0 truncate text-left [direction:rtl]">
          <bdi dir="ltr">{earlierAncestors.join(" / ")} / </bdi>
        </span>
      )}
      <span className="shrink-0 whitespace-nowrap">{immediateParent} /</span>
    </span>
  );
}
