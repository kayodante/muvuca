"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface NumberPopInProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: string | number;
}

/**
 * Number pop-in (transitions.dev / 02-number-pop-in.md).
 *
 * Re-enters characters with a blurred slide when a number/counter updates.
 * Each character animates independently and the last two digits stagger
 * so counter changes feel alive without chaos.
 */
export function NumberPopIn({ value, className, ...props }: NumberPopInProps) {
  const str = String(value);
  const containerRef = useRef<HTMLSpanElement>(null);
  const isFirstMount = useRef(true);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setIsAnimating(false);
    const container = containerRef.current;
    if (container) void container.offsetHeight;
    const frame = requestAnimationFrame(() => {
      setIsAnimating(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [str]);

  const chars = str.split("");
  const total = chars.length;

  return (
    <span
      ref={containerRef}
      className={cn("t-digit-group", isAnimating && "is-animating", className)}
      {...props}
    >
      {chars.map((char, index) => {
        let stagger: "1" | "2" | undefined;
        if (total > 1 && index === total - 2) stagger = "1";
        else if (total > 0 && index === total - 1) stagger = "2";

        return (
          <span
            key={`${index}-${char}`}
            className="t-digit"
            data-stagger={stagger}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}
