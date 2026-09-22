import { cn } from "@/lib/utils";

export interface ShimmerTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: string;
  children?: React.ReactNode;
}

/**
 * Shimmer text (transitions.dev / 15-shimmer-text.md).
 *
 * Sweeps a highlight band across muted text on a pure CSS loop.
 * Keeps in-progress labels feeling alive without relying on a spinner.
 */
export function ShimmerText({
  text,
  children,
  className,
  ...props
}: ShimmerTextProps) {
  return (
    <span className={cn("t-shimmer", className)} data-text={text} {...props}>
      {children ?? text}
    </span>
  );
}
