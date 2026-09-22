import Link from "next/link";

import { cn } from "@/lib/utils";
import { swatchClassFor } from "@/lib/tags/colors";

/**
 * Low-intensity chip, color shown only as a small swatch dot (never a
 * fully colored block). Selected state adds a ring, not just a color
 * change, so selection never depends on hue alone.
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
          "size-2 shrink-0 rounded-full transition-transform duration-(--motion-fast) ease-out-muvuca group-hover/chip:scale-125 motion-reduce:transition-none motion-reduce:group-hover/chip:scale-100",
          swatchClassFor(colorToken),
        )}
      />
      <span className="truncate">{name}</span>
    </>
  );

  const classes = cn(
    "group/chip bg-secondary text-muted-foreground text-label-md inline-flex h-7 max-w-full items-center gap-1.5 rounded-full px-2.5",
    selected && "ring-primary text-foreground ring-2",
    href &&
      "hover:bg-secondary/80 hover:text-foreground active:scale-[0.96] focus-visible:ring-ring ease-out-muvuca transition-[background-color,color,box-shadow,transform] duration-(--motion-fast) focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:active:scale-100 motion-reduce:transition-none",
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
