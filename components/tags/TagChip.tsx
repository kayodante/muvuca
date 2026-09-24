import Link from "next/link";

import { cn } from "@/lib/utils";
import { swatchClassFor } from "@/lib/tags/colors";

/**
 * Low-intensity chip, color shown only as a small swatch dot (never a
 * fully colored block). Selected state adds a ring, not just a color
 * change, so selection never depends on hue alone.
 *
 * Geometry and states follow Figma "Tag" (253:2637): 0.5px `border`
 * stroke inside (an inset ring: Chrome rounds a 0.5px `border` up to 1px,
 * the shadow keeps the hairline), 12px medium label in `ink-muted`, 6px swatch 8px from the label,
 * 8/10 horizontal padding. Hover lays `light-2` over the fill and leaves the
 * label color alone. The overlay is an inset shadow, not a background
 * change: it stacks a translucent fill over `surface-subtle` exactly like
 * Figma's second fill, and it transitions. At rest it is the same shadow in
 * `transparent` so the two interpolate. ItemCard adds
 * `group-hover:inset-shadow-light-2` so every chip in a hovered card takes
 * this same Hover state.
 */
export function TagChip({
  name,
  colorToken,
  href,
  selected = false,
  className,
}: {
  name: string;
  colorToken: string;
  href?: string;
  selected?: boolean;
  className?: string;
}) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full transition-transform duration-(--motion-fast) ease-out-muvuca group-hover/chip:scale-125 motion-reduce:transition-none motion-reduce:group-hover/chip:scale-100",
          swatchClassFor(colorToken),
        )}
      />
      <span className="truncate">{name}</span>
    </>
  );

  const classes = cn(
    "group/chip inline-flex h-7 max-w-full items-center gap-2 rounded-full bg-secondary inset-ring-[0.5px] inset-ring-border pr-2.5 pl-2 text-xs leading-4 font-medium text-muted-foreground inset-shadow-[0_0_0_999px] inset-shadow-transparent",
    selected && "ring-primary text-foreground ring-2",
    href &&
      "hover:inset-shadow-light-2 active:scale-[0.96] focus-visible:ring-ring ease-out-muvuca transition-[box-shadow,transform] duration-(--motion-fast) focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:active:scale-100 motion-reduce:transition-none",
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        aria-current={selected || undefined}
      >
        {content}
      </Link>
    );
  }

  return <span className={classes}>{content}</span>;
}
