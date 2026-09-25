import { cn } from "@/lib/utils";
import { swatchClassFor } from "@/lib/tags/colors";

/**
 * Tag color dot from Figma "Tag" (253:2637): two stacked ellipses in the
 * tag color, a copy blurred 10px (CSS `blur(5px)`, Figma's radius is 2σ) as
 * a glow and the dot itself with the "Light" effect style (`shadow-light`).
 * Size comes from `className` (e.g. `size-1.5`).
 */
export function TagDot({
  colorToken,
  className,
}: {
  colorToken: string;
  className?: string;
}) {
  const swatch = swatchClassFor(colorToken);
  return (
    <span aria-hidden="true" className={cn("relative shrink-0", className)}>
      <span
        className={cn("absolute inset-0 rounded-full blur-[5px]", swatch)}
      />
      <span
        className={cn("absolute inset-0 rounded-full shadow-light", swatch)}
      />
    </span>
  );
}
