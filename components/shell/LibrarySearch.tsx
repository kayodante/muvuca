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
import {
  animateSearchClear,
  type ClearSearchAnimation,
} from "@/lib/motion/clear-search";
import { useDictionary } from "@/lib/i18n/client";
import { useSpotlight } from "@/components/spotlight";

const emptySubscribe = () => () => {};

function cssNumber(name: string, fallback: number) {
  const value = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(name),
  );
  return Number.isFinite(value) ? value : fallback;
}

function getShortcutLabel() {
  if (typeof navigator === "undefined") return "⌘K";
  const isMac = /(Mac|iPhone|iPod|iPad)/i.test(
    navigator.userAgent || navigator.platform || "",
  );
  return isMac ? "⌘K" : "Ctrl+K";
}

/** Searches the library, retaining tag scope when a tag is open. */
export function LibrarySearch() {
  const t = useDictionary();
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const scopedToTag = pathname.startsWith("/t/");
  const searchOnCurrentPage = pathname === "/library" || scopedToTag;
  const searchPath = searchOnCurrentPage ? pathname : "/library";
  const urlQuery = searchOnCurrentPage ? (params.get("q") ?? "") : "";
  const [query, setQuery] = useState(urlQuery);
  const [previousUrlQuery, setPreviousUrlQuery] = useState(urlQuery);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const clearAnimationRef = useRef<ClearSearchAnimation | null>(null);
  const skipDebouncedClearRef = useRef(false);
  const [isClearing, setIsClearing] = useState(false);
  const shortcutLabel = useSyncExternalStore(
    emptySubscribe,
    getShortcutLabel,
    () => "⌘K",
  );

  const { openSpotlight } = useSpotlight();

  if (urlQuery !== previousUrlQuery) {
    setPreviousUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  useEffect(
    () => () => {
      clearAnimationRef.current?.cancel();
    },
    [],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (skipDebouncedClearRef.current && query === "") {
        skipDebouncedClearRef.current = false;
        return;
      }
      const next = new URLSearchParams(
        searchOnCurrentPage ? params.toString() : "",
      );
      const normalized = query.trim();
      if (normalized === urlQuery) return;
      if (normalized) next.set("q", normalized);
      else next.delete("q");
      next.delete("cursor");
      const search = next.toString();
      const href = search ? `${searchPath}?${search}` : searchPath;
      startTransition(() => router.replace(href, { scroll: false }));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [params, query, router, searchOnCurrentPage, searchPath, urlQuery]);

  function finishClear() {
    clearAnimationRef.current = null;
    setIsClearing(false);
    if (mirrorRef.current) mirrorRef.current.style.cssText = "";
    if (placeholderRef.current) placeholderRef.current.style.cssText = "";
    if (mirrorRef.current) mirrorRef.current.textContent = "";
    if (glowRef.current) {
      glowRef.current.style.opacity = "0";
      glowRef.current.style.background = "";
    }
  }

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
    const next = new URLSearchParams(
      searchOnCurrentPage ? params.toString() : "",
    );
    next.delete("q");
    next.delete("cursor");
    const search = next.toString();
    const href = search ? `${searchPath}?${search}` : searchPath;
    startTransition(() => router.replace(href, { scroll: false }));
    inputRef.current?.focus();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const inFly = cssNumber("--clear-in-fly", 12);
    const blur = cssNumber("--clear-blur", 2);

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
    const animation = animateSearchClear({
      mirror: activeMirror,
      placeholder: activePlaceholder,
      glow: activeGlow,
    });
    clearAnimationRef.current = animation;
    void animation.finished.then(() => {
      finishClear();
      if (keepFocus) {
        requestAnimationFrame(() => activeInput.focus({ preventScroll: true }));
      }
    });
  }

  return (
    // The focus ring lives on the wrapper, not the input: `.t-clear` clips
    // its overflow so the clear animation's flying text stays inside the
    // field, and that clip would cut an input ring down to its corners.
    // Solid, not `ring-ring/50`: the field is borderless, so this ring is the
    // whole focus indicator, and at 50% it read 1.77:1 on the light topbar.
    <div
      ref={wrapperRef}
      className={`t-clear w-full max-w-lg rounded-md transition-shadow duration-(--motion-fast) ease-out-muvuca has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring motion-reduce:transition-none ${query ? "has-value" : ""} ${isClearing ? "is-clearing" : ""}`}
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
        onChange={(event) => {
          const value = event.target.value;
          const animation = clearAnimationRef.current;
          if (animation) {
            animation.cancel();
            finishClear();
          }
          if (value) skipDebouncedClearRef.current = false;
          setQuery(value);
        }}
        placeholder={
          scopedToTag
            ? t.shell.search.tagScope
            : t.shell.search.shortPlaceholder
        }
        aria-label={
          scopedToTag ? t.shell.search.tagScope : t.shell.search.placeholder
        }
        className="border-0 bg-background pr-14 pl-9 shadow-light focus-visible:ring-0 dark:bg-background [&::-webkit-search-cancel-button]:hidden"
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
        {scopedToTag
          ? t.shell.search.tagScope
          : t.shell.search.shortPlaceholder}
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
          aria-label={t.shell.search.clear}
          className="t-clear-btn absolute top-1/2 right-2.5 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors duration-(--motion-fast) ease-out-muvuca outline-none after:absolute after:-inset-2.5 after:content-[''] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          <XIcon aria-hidden="true" className="size-3.5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => openSpotlight()}
          aria-label={t.shell.search.openSpotlight}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer outline-none after:absolute after:-inset-y-3 after:left-1/2 after:w-11 after:-translate-x-1/2 after:content-[''] focus-visible:ring-2 focus-visible:ring-ring"
        >
          <kbd
            aria-hidden="true"
            className="text-metadata hidden rounded-xl bg-secondary/70 px-2 py-0.5 font-mono text-muted-foreground shadow-light transition-colors select-none hover:bg-secondary hover:text-foreground sm:block [@media(hover:none)]:hidden"
          >
            {shortcutLabel}
          </kbd>
          <SearchIcon
            aria-hidden="true"
            className="size-4 text-muted-foreground sm:hidden [@media(hover:none)]:block"
          />
        </button>
      )}
      {/* A hairline under the field, not a spinner: search runs on every
          keystroke, so the indicator has to stay out of the way while still
          saying the results are catching up. */}
      {isPending && (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px rounded-full bg-primary motion-safe:animate-search-sweep"
        />
      )}
      {/* Always mounted: a live region inserted together with its text is
          not announced, only a change to one that already exists. */}
      <span role="status" className="sr-only">
        {isPending ? t.shell.search.searching : ""}
      </span>
    </div>
  );
}
