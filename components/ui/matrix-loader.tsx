import { cn } from "@/lib/utils";

export type MatrixVariant = "scan" | "twinkle" | "orbit" | "pulse";

const CORNERS = new Set([0, 3, 12, 15]);
const RING = [1, 2, 7, 11, 14, 13, 8, 4];
const INNER = new Set([5, 6, 9, 10]);
const TWINKLE = [7, 2, 11, 5, 14, 9, 0, 12, 3, 15, 6, 10, 13, 1, 8, 4];

const DEFAULT_CYCLE = 1200;

export interface MatrixLoaderProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: MatrixVariant;
  rounded?: boolean;
  cycle?: number;
  "aria-label"?: string;
}

/**
 * Matrix dot loader (transitions.dev / 31-matrix-loader.md).
 *
 * Micro inline loader built from a 4×4 matrix of 2px dots.
 * Perfect where a spinner is too loud: alongside a status line, in buttons,
 * tags, or compact item cards.
 */
export function MatrixLoader({
  variant = "pulse",
  rounded = true,
  cycle = DEFAULT_CYCLE,
  className,
  "aria-label": ariaLabel,
  ...props
}: MatrixLoaderProps) {
  return (
    <span
      role="status"
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel || undefined}
      data-variant={variant}
      data-rounded={rounded ? "true" : undefined}
      className={cn("t-matrix inline-grid shrink-0", className)}
      {...props}
    >
      {Array.from({ length: 16 }, (_, idx) => {
        const isCorner = rounded && CORNERS.has(idx);
        let delay = 0;
        let animationNone = false;

        if (variant === "orbit") {
          const ringPos = RING.indexOf(idx);
          if (ringPos !== -1) {
            delay = Math.round(ringPos * (cycle / 8));
          } else {
            animationNone = true;
          }
        } else if (variant === "scan") {
          const col = idx % 4;
          delay = Math.round(col * (cycle / 10));
        } else if (variant === "twinkle") {
          delay = Math.round((TWINKLE[idx] ?? 0) * (cycle / 16));
        } else if (variant === "pulse") {
          const isInner = INNER.has(idx);
          delay = isInner ? 0 : Math.round(cycle * 0.16);
        }

        const dotStyle: React.CSSProperties = {
          "--d": String(delay),
          ...(animationNone ? { animation: "none" } : {}),
        } as React.CSSProperties;

        return (
          <i
            key={idx}
            className={isCorner ? "is-gap" : undefined}
            style={dotStyle}
          />
        );
      })}
    </span>
  );
}
