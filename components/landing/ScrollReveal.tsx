"use client";

import type { ReactNode } from "react";
import { useInViewOnce } from "@/lib/hooks/use-in-view";
import { cn } from "@/lib/utils";

interface ScrollRevealProps {
  children: ReactNode;
  /** "stagger" = headline+copy rising in place, each element offset slightly.
   *  "panel" = single surface sliding into its region as one piece. */
  variant: "stagger" | "panel";
  className?: string;
  id?: string;
}

/** Client boundary for scroll-triggered entrance motion, wired to `useInViewOnce`. */
export function ScrollReveal({
  children,
  variant,
  className,
  id,
}: ScrollRevealProps) {
  const [ref, inView] = useInViewOnce<HTMLDivElement>();

  return (
    <div
      ref={ref}
      id={id}
      className={cn(
        variant === "stagger" && "t-stagger",
        variant === "stagger" && inView && "is-shown",
        variant === "panel" && "t-panel-slide",
        className,
      )}
      data-open={variant === "panel" ? (inView ? "true" : "false") : undefined}
    >
      {children}
    </div>
  );
}
