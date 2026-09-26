"use client";

import { useEffect, useRef, useState } from "react";

/** Flag que liga e desliga sozinha após `durationMs`; religar reinicia a contagem. */
export function useTransientFlag(
  durationMs: number,
): [on: boolean, trigger: () => void] {
  const [on, setOn] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    [],
  );

  function trigger() {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    setOn(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setOn(false);
    }, durationMs);
  }

  return [on, trigger];
}
