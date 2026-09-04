"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fires once when the element first enters the viewport, then disconnects.
 * Scroll-triggered entrance motion is a one-time reveal, not a toggle.
 */
export function useInViewOnce<T extends Element>(
  threshold = 0.2,
  rootMargin = "0px 0px -10% 0px",
) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, threshold, rootMargin]);

  return [ref, inView] as const;
}
