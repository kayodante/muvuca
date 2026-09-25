"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon, RefreshCwIcon } from "lucide-react";
import type { ItemType } from "@/lib/validation/item";
import { SEARCH_SORTS, type SearchSort } from "@/lib/validation/search";
import { useDictionary } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/dictionaries/pt-BR";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MatrixLoader } from "@/components/ui/matrix-loader";
import { ShimmerText } from "@/components/ui/shimmer-text";

function MatrixIcon() {
  return <MatrixLoader variant="orbit" rounded aria-hidden="true" />;
}

function RefreshStateIcon({ state }: { state: "idle" | "refreshing" }) {
  const states = [
    {
      value: "idle",
      content: <RefreshCwIcon aria-hidden="true" data-icon="inline-start" />,
    },
    { value: "refreshing", content: <MatrixIcon /> },
  ] as const;
  return (
    <span className="relative inline-block size-4">
      {states.map(({ value, content }) => (
        <span
          key={value}
          className="t-icon-swap absolute inset-0"
          data-state={state === value ? "a" : "b"}
        >
          <span className="t-icon" data-icon="a">
            {content}
          </span>
          <span className="t-icon" data-icon="b" />
        </span>
      ))}
    </span>
  );
}

function TextSwap({ text }: { text: string }) {
  const [displayText, setDisplayText] = useState(text);
  const elementRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<number | null>(null);
  const enteringRef = useRef(false);

  useEffect(() => {
    if (text === displayText) return;
    const element = elementRef.current;
    if (!element) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      timerRef.current = window.setTimeout(() => setDisplayText(text), 0);
      return;
    }
    element.classList.add("is-exit");
    const value = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--text-swap-dur",
      ),
    );
    timerRef.current = window.setTimeout(
      () => {
        element.classList.remove("is-exit");
        element.classList.add("is-enter-start");
        enteringRef.current = true;
        setDisplayText(text);
      },
      Number.isFinite(value) ? value : 150,
    );
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [displayText, text]);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element || !enteringRef.current) return;
    void element.offsetHeight;
    element.classList.remove("is-enter-start");
    enteringRef.current = false;
  }, [displayText]);

  return (
    <span ref={elementRef} className="t-text-swap">
      {displayText}
    </span>
  );
}

function sortLabels(t: Dictionary): Record<SearchSort, string> {
  return t.items.toolbar.sortLabels;
}

function typeTabs(t: Dictionary): { value: ItemType | null; label: string }[] {
  return [
    { value: null, label: t.items.toolbar.typeTabs.all },
    { value: "link", label: t.items.toolbar.typeTabs.link },
    { value: "prompt", label: t.items.toolbar.typeTabs.prompt },
    { value: "code_component", label: t.items.toolbar.typeTabs.code },
  ];
}

interface LibraryToolbarProps {
  type: ItemType | null;
  sort: SearchSort;
  isPending: boolean;
  /** This page renders at least one link item -- the only thing whose
   * preview can be refreshed. No server-side pending count gates the
   * button: "nothing was pending" is feedback the action itself gives. */
  canRefreshPreviews: boolean;
  isRefreshingPreviews: boolean;
  onRefreshPreviews: () => void;
  onFilterChange: (values: Record<string, string | null>) => void;
}

/** Figma "Seus itens" toolbar (node 78:3676): type filter as a tab group,
 * sort as a bordered dropdown button. No tag filter and no "limpar
 * filtros" here -- the sidebar is the tag-scoping surface, the search box
 * already owns its own clear affordance, and the empty state offers its
 * own "Limpar filtros" once a filtered search actually comes up empty. */
export function LibraryToolbar({
  type,
  sort,
  isPending,
  canRefreshPreviews,
  isRefreshingPreviews,
  onRefreshPreviews,
  onFilterChange,
}: LibraryToolbarProps) {
  const t = useDictionary();
  const refreshState = isRefreshingPreviews ? "refreshing" : "idle";
  const tabsRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  function movePill(tab: HTMLButtonElement, animate: boolean) {
    const pill = pillRef.current;
    if (!pill) return;
    const transition = pill.style.transition;
    if (!animate) pill.style.transition = "none";
    pill.style.transform = `translateX(${tab.offsetLeft}px)`;
    pill.style.width = `${tab.offsetWidth}px`;
    pill.dataset.ready = "true";
    if (!animate) {
      void pill.offsetWidth;
      pill.style.transition = transition;
    }
  }

  useLayoutEffect(() => {
    const sync = () => {
      const active = tabsRef.current?.querySelector<HTMLButtonElement>(
        '[aria-pressed="true"]',
      );
      if (active) movePill(active, false);
    };
    const frame = requestAnimationFrame(sync);
    window.addEventListener("resize", sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", sync);
    };
  }, [type]);

  const labels = sortLabels(t);

  return (
    <section
      aria-label={t.items.toolbar.sectionLabel}
      className="flex flex-wrap items-center gap-3"
    >
      {canRefreshPreviews && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefreshPreviews}
          disabled={refreshState === "refreshing"}
          aria-busy={refreshState === "refreshing" || undefined}
          className={cn(
            "min-w-[13rem]",
            refreshState === "refreshing" &&
              "bg-card! text-brand-accent disabled:opacity-100!",
          )}
        >
          <RefreshStateIcon state={refreshState} />
          <TextSwap
            text={
              refreshState === "refreshing"
                ? t.items.toolbar.refreshing
                : t.items.toolbar.refreshPreviews
            }
          />
        </Button>
      )}

      <div
        role="group"
        aria-label={t.items.toolbar.typeFilterLabel}
        ref={tabsRef}
        className="t-tabs"
      >
        <span ref={pillRef} className="t-tabs-pill" aria-hidden="true" />
        {typeTabs(t).map((tab) => (
          <button
            key={tab.label}
            type="button"
            aria-pressed={type === tab.value}
            onClick={() => onFilterChange({ type: tab.value })}
            onClickCapture={(event) => movePill(event.currentTarget, true)}
            className="t-tab text-body-sm"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              aria-label={t.items.toolbar.sortAriaLabel}
              className="h-8 rounded-md border-0 bg-surface px-3 py-1.5 shadow-light dark:bg-surface"
            />
          }
        >
          {labels[sort]}
          <ChevronDownIcon aria-hidden="true" data-icon="inline-end" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {SEARCH_SORTS.map((option) => (
            <DropdownMenuItem
              key={option}
              aria-current={option === sort || undefined}
              onClick={() =>
                onFilterChange({ sort: option === "newest" ? null : option })
              }
            >
              <span className="flex-1">{labels[option]}</span>
              {option === sort && (
                <CheckIcon aria-hidden="true" className="text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {isPending && (
        <span
          className="text-body-sm flex items-center gap-1.5 text-muted-foreground"
          aria-live="polite"
        >
          <MatrixLoader
            variant="scan"
            rounded
            className="size-3.5"
            aria-hidden="true"
          />
          <ShimmerText text={t.items.toolbar.loadingItem} />
        </span>
      )}
    </section>
  );
}
