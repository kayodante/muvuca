"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";

import { Input } from "@/components/ui/input";

const emptySubscribe = () => () => {};

function cssNumber(name: string, fallback: number) {
  const value = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(name),
  );
  return Number.isFinite(value) ? value : fallback;
}

function cubicBezier(value: string) {
  const match = value.match(
    /cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/,
  );
  if (!match) return (time: number) => time;
  const [x1 = 0, y1 = 0, x2 = 1, y2 = 1] = match.slice(1).map(Number);
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  return (time: number) => {
    if (time <= 0) return 0;
    if (time >= 1) return 1;
    let sample = time;
    for (let index = 0; index < 8; index += 1) {
      const delta = ((ax * sample + bx) * sample + cx) * sample - time;
      const derivative = (3 * ax * sample + 2 * bx) * sample + cx;
      if (Math.abs(delta) < 0.000001 || derivative === 0) break;
      sample -= delta / derivative;
    }
    return ((ay * sample + by) * sample + cy) * sample;
  };
}

function getShortcutLabel() {
  if (typeof navigator === "undefined") return "⌘K";
  const isMac = /(Mac|iPhone|iPod|iPad)/i.test(
    navigator.userAgent || navigator.platform || "",
  );
  return isMac ? "⌘K" : "Ctrl+K";
}

/** Keeps the structural shell search in the URL without a full navigation. */
export function LibrarySearch() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [previousUrlQuery, setPreviousUrlQuery] = useState(urlQuery);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const clearFrameRef = useRef<number | null>(null);
  const skipDebouncedClearRef = useRef(false);
  const [isClearing, setIsClearing] = useState(false);
  const shortcutLabel = useSyncExternalStore(
    emptySubscribe,
    getShortcutLabel,
    () => "⌘K",
  );

  if (urlQuery !== previousUrlQuery) {
    setPreviousUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        (event.key === "k" || event.key === "K")
      ) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(
    () => () => {
      if (clearFrameRef.current !== null) {
        cancelAnimationFrame(clearFrameRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (skipDebouncedClearRef.current && query === "") {
        skipDebouncedClearRef.current = false;
        return;
      }
      const next = new URLSearchParams(params.toString());
      const normalized = query.trim();
      if (normalized === urlQuery) return;
      if (normalized) next.set("q", normalized);
      else next.delete("q");
      next.delete("cursor");
      const search = next.toString();
      const href = search ? `${pathname}?${search}` : pathname;
      startTransition(() => router.replace(href, { scroll: false }));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [params, pathname, query, router, urlQuery]);

  function handleClear() {
    const input = inputRef.current;
    const wrapper = wrapperRef.current;
    const mirror = mirrorRef.current;
    const placeholder = placeholderRef.current;
    const glow = glowRef.current;
    if (!input || !wrapper || !mirror || !placeholder || !glow || !query)
      return;

    const activeInput = input;
    const activeMirror = mirror;
    const activePlaceholder = placeholder;
    const activeGlow = glow;

    const capturedText = query;
    const keepFocus = document.activeElement === input;
    skipDebouncedClearRef.current = true;
    setQuery("");
    const next = new URLSearchParams(params.toString());
    next.delete("q");
    next.delete("cursor");
    const search = next.toString();
    const href = search ? `${pathname}?${search}` : pathname;
    startTransition(() => router.replace(href, { scroll: false }));
    inputRef.current?.focus();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const total = cssNumber("--clear-dur", 1000);
    const outDuration = cssNumber("--clear-out-dur", 400);
    const inDuration = cssNumber("--clear-in-dur", 400);
    const outFly = cssNumber("--clear-out-fly", 12);
    const inFly = cssNumber("--clear-in-fly", 12);
    const blur = cssNumber("--clear-blur", 2);
    const glowDelay = cssNumber("--glow-delay", 50);
    const glowPeak = cssNumber("--glow-peak-at", 0.15);
    const glowOpacity = cssNumber("--glow-opacity", 0.42);
    const rootStyle = getComputedStyle(document.documentElement);
    const easeOut = cubicBezier(rootStyle.getPropertyValue("--clear-out-ease"));
    const easeIn = cubicBezier(rootStyle.getPropertyValue("--clear-in-ease"));

    activeMirror.textContent = capturedText.replace(/ /g, "\u00a0");
    const context = document.createElement("canvas").getContext("2d");
    if (context) {
      context.font = getComputedStyle(activeInput).font;
      const rgb =
        document.documentElement.classList.contains("dark") ||
        document.documentElement.dataset.theme === "dark"
          ? "255,255,255"
          : "0,0,0";
      const width = wrapper.clientWidth || 280;
      const left =
        Number.parseFloat(getComputedStyle(activeInput).paddingLeft) || 12;
      const spread = cssNumber("--glow-spread", 1.5);
      let x = 0;
      const layers: string[] = [];
      for (const segment of capturedText.split(/(\s+)/)) {
        const segmentWidth = context.measureText(segment).width;
        if (segment.trim()) {
          const center = left + x + segmentWidth / 2;
          const halfWidth = Math.max(segmentWidth * 0.45, 8) * spread;
          const spots: [number, number, number, number][] = [
            [0, 0.8, 7, 0.22],
            [halfWidth * 0.45, 0.55, 8, 0.18],
            [-halfWidth * 0.4, 0.65, 6, 0.16],
            [halfWidth * 0.15, 0.9, 5, 0.14],
          ];
          for (const [dx, radiusWidth, radiusHeight, alpha] of spots) {
            const position = (((center + dx) / width) * 100).toFixed(2);
            layers.push(
              `radial-gradient(ellipse ${Math.max(halfWidth * radiusWidth, 2).toFixed(1)}px ${radiusHeight}px at ${position}% 100%, rgba(${rgb},${alpha}), transparent)`,
            );
          }
        }
        x += segmentWidth;
      }
      activeGlow.style.background = layers.join(", ");
    }

    setIsClearing(true);
    activeGlow.style.opacity = "0";
    activePlaceholder.style.transform = `translateY(-${inFly}px)`;
    activePlaceholder.style.opacity = "0.9";
    activePlaceholder.style.filter = `blur(${blur}px)`;
    const started = performance.now();

    function tick(now: number) {
      const elapsed = now - started;
      const outProgress = easeOut(Math.min(1, elapsed / outDuration));
      activeMirror.style.transform = `translateY(${(outProgress * outFly).toFixed(1)}px)`;
      activeMirror.style.opacity = (1 - outProgress).toFixed(3);
      activeMirror.style.filter = `blur(${(outProgress * blur).toFixed(1)}px)`;
      const inProgress = easeIn(Math.min(1, elapsed / inDuration));
      activePlaceholder.style.transform = `translateY(${(-inFly + inProgress * inFly).toFixed(1)}px)`;
      activePlaceholder.style.opacity = (0.9 + inProgress * 0.1).toFixed(3);
      activePlaceholder.style.filter = `blur(${(blur - inProgress * blur).toFixed(1)}px)`;
      const glowProgress =
        elapsed <= glowDelay
          ? 0
          : Math.min(1, (elapsed - glowDelay) / Math.max(1, total - glowDelay));
      const envelope =
        glowProgress < glowPeak
          ? glowProgress / glowPeak
          : 1 - (glowProgress - glowPeak) / (1 - glowPeak);
      activeGlow.style.opacity = (envelope * glowOpacity).toFixed(3);

      if (elapsed < total) {
        clearFrameRef.current = requestAnimationFrame(tick);
        return;
      }
      setIsClearing(false);
      activeMirror.style.cssText = "";
      activePlaceholder.style.cssText = "";
      activeMirror.textContent = "";
      activeGlow.style.opacity = "0";
      activeGlow.style.background = "";
      clearFrameRef.current = null;
      if (keepFocus) {
        requestAnimationFrame(() => activeInput.focus({ preventScroll: true }));
      }
    }

    tick(started);
  }

  return (
    <div
      ref={wrapperRef}
      className={`t-clear w-full max-w-lg ${query ? "has-value" : ""} ${isClearing ? "is-clearing" : ""}`}
      aria-busy={isPending}
    >
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        ref={inputRef}
        type="search"
        dir="auto"
        maxLength={240}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar na biblioteca"
        aria-label="Buscar na biblioteca"
        className="bg-background pr-14 pl-9 dark:bg-background [&::-webkit-search-cancel-button]:hidden"
      />
      <div
        ref={mirrorRef}
        className="t-clear-mirror pr-14 pl-9"
        aria-hidden="true"
      />
      <div
        ref={placeholderRef}
        className="t-clear-placeholder pr-14 pl-9"
        aria-hidden="true"
      >
        Buscar na biblioteca
      </div>
      <div ref={glowRef} className="t-clear-glow" aria-hidden="true" />
      {query ? (
        <button
          type="button"
          onPointerDown={(event) => {
            if (document.activeElement === inputRef.current)
              event.preventDefault();
          }}
          onMouseDown={(event) => {
            if (document.activeElement === inputRef.current)
              event.preventDefault();
          }}
          onClick={handleClear}
          aria-label="Limpar busca"
          className="t-clear-btn absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors duration-(--motion-fast) ease-out-muvuca outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          <XIcon aria-hidden="true" className="size-3.5" />
        </button>
      ) : (
        <kbd
          aria-hidden="true"
          className="text-metadata pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-border/80 bg-muted/60 px-1.5 py-0.5 font-mono text-muted-foreground select-none"
        >
          {shortcutLabel}
        </kbd>
      )}
      {isPending && (
        <>
          {/* A hairline under the field, not a spinner: search runs on every
              keystroke, so the indicator has to stay out of the way while
              still saying the results are catching up. */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-px rounded-full bg-primary motion-safe:animate-search-sweep"
          />
          <span className="sr-only">Pesquisando…</span>
        </>
      )}
    </div>
  );
}
