import Link from "next/link";

import { cn } from "@/lib/utils";
import { TagDot } from "./TagDot";

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
  onClick,
  selected = false,
  className,
  title,
}: {
  name: string;
  colorToken: string;
  href?: string;
  /**
   * Renders as a `<button aria-pressed>` toggle instead of a link/span --
   * the spotlight's tag filter row, which has no href to navigate to.
   * Mutually exclusive with `href` in practice.
   */
  onClick?: () => void;
  selected?: boolean;
  className?: string;
  /** Pointer tooltip when the label truncates. Defaults to `name`; pass a
   * fuller string (e.g. a full ancestor path) when the caller has one. */
  title?: string;
}) {
  const content = (
    <>
      <TagDot
        colorToken={colorToken}
        className="size-1.5 transition-[scale] duration-(--motion-fast) ease-out-muvuca group-hover/chip:scale-125 motion-reduce:transition-none motion-reduce:group-hover/chip:scale-100"
      />
      <span className="min-w-0 truncate">{name}</span>
    </>
  );

  const interactive = Boolean(href || onClick);
  const classes = cn(
    "group/chip inline-flex h-7 max-w-full items-center gap-2 rounded-full bg-secondary inset-ring-[0.5px] inset-ring-border pr-2.5 pl-2 text-xs leading-4 font-medium text-muted-foreground inset-shadow-[0_0_0_999px] inset-shadow-transparent",
    selected && "ring-primary text-foreground ring-2",
    interactive &&
      "hover:inset-shadow-light-2 active:scale-[0.97] focus-visible:ring-ring ease-out-muvuca transition-[box-shadow,scale] duration-(--motion-fast) focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:active:scale-100 motion-reduce:transition-none",
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        title={title ?? name}
        className={classes}
        aria-current={selected || undefined}
      >
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        title={title ?? name}
        className={classes}
      >
        {content}
      </button>
    );
  }

  return (
    <span title={title ?? name} className={classes}>
      {content}
    </span>
  );
}
