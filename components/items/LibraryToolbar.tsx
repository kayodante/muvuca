"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon, RefreshCwIcon } from "lucide-react";
import type { ItemType } from "@/lib/validation/item";
import { SEARCH_SORTS, type SearchSort } from "@/lib/validation/search";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** How long the "Atualizado" confirmation holds before reverting to default
 * (Figma node 142:496). Only flashes after a click this hook was told about
 * via `markRequested` -- `isRefreshing` also goes true->false for the
 * automatic per-page drain (usePreviewDrain.ts) on mount/filter change,
 * which should keep the button silent, not claim credit for work the user
 * didn't ask this button to do. */
const REFRESH_DONE_MS = 1500;

function useRefreshDoneFlash(isRefreshing: boolean) {
  const [done, setDone] = useState(false);
  const wasRefreshing = useRef(isRefreshing);
  const requested = useRef(false);

  useEffect(() => {
    if (wasRefreshing.current && !isRefreshing && requested.current) {
      requested.current = false;
      setDone(true);
      const timer = window.setTimeout(() => setDone(false), REFRESH_DONE_MS);
      wasRefreshing.current = isRefreshing;
      return () => window.clearTimeout(timer);
    }
    wasRefreshing.current = isRefreshing;
  }, [isRefreshing]);

  return { done, markRequested: () => (requested.current = true) };
}

const MATRIX_RING = [1, 2, 7, 11, 14, 13, 8, 4];
const MATRIX_CORNERS = new Set([0, 3, 12, 15]);

function MatrixIcon() {
  return (
    <span
      aria-hidden="true"
      className="t-matrix"
      data-variant="orbit"
      data-rounded="true"
    >
      {Array.from({ length: 16 }, (_, index) => {
        const ring = MATRIX_RING.indexOf(index);
        return (
          <i
            key={index}
            ref={(dot) => dot?.style.setProperty("--d", String(ring * 150))}
            className={MATRIX_CORNERS.has(index) ? "is-gap" : undefined}
            style={ring < 0 ? { animation: "none" } : undefined}
          />
        );
      })}
    </span>
  );
}

function RefreshStateIcon({
  state,
}: {
  state: "idle" | "refreshing" | "done";
}) {
  const states = [
    {
      value: "idle",
      content: <RefreshCwIcon aria-hidden="true" data-icon="inline-start" />,
    },
    { value: "refreshing", content: <MatrixIcon /> },
    {
      value: "done",
      content: <CheckIcon aria-hidden="true" data-icon="inline-start" />,
    },
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

export const SORT_LABELS: Record<SearchSort, string> = {
  newest: "Mais recentes",
  oldest: "Mais antigos",
  title_asc: "Título A–Z",
  title_desc: "Título Z–A",
  updated: "Atualizados recentemente",
};

const TYPE_TABS: { value: ItemType | null; label: string }[] = [
  { value: null, label: "Tudo" },
  { value: "link", label: "Link" },
  { value: "prompt", label: "Prompt" },
  { value: "code_component", label: "Code" },
];

export interface LibraryToolbarProps {
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
  const { done: isDone, markRequested } =
    useRefreshDoneFlash(isRefreshingPreviews);
  const refreshState = isRefreshingPreviews
    ? "refreshing"
    : isDone
      ? "done"
      : "idle";
  const tabsRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  function movePill(tab: HTMLButtonElement, animate: boolean) {
    const pill = pillRef.current;
    if (!pill) return;
    const transition = pill.style.transition;
    if (!animate) pill.style.transition = "none";
    pill.style.transform = `translateX(${tab.offsetLeft}px)`;
    pill.style.width = `${tab.offsetWidth}px`;
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

  return (
    <section
      aria-label="Filtros e ordenação"
      className="flex flex-wrap items-center gap-3"
    >
      {canRefreshPreviews && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            markRequested();
            onRefreshPreviews();
          }}
          disabled={refreshState === "refreshing"}
          aria-busy={refreshState === "refreshing" || undefined}
          className={cn(
            "min-w-[13rem]",
            refreshState !== "idle" &&
              "bg-card! text-brand-accent disabled:opacity-100!",
          )}
        >
          <RefreshStateIcon state={refreshState} />
          <TextSwap
            text={
              refreshState === "refreshing"
                ? "Atualizando"
                : refreshState === "done"
                  ? "Atualizado"
                  : "Atualizar pré-visualizações"
            }
          />
        </Button>
      )}

      <div
        role="group"
        aria-label="Filtrar por tipo"
        ref={tabsRef}
        className="t-tabs"
      >
        <span ref={pillRef} className="t-tabs-pill" aria-hidden="true" />
        {TYPE_TABS.map((tab) => {
          const active = type === tab.value;
          return (
            <button
              key={tab.label}
              type="button"
              aria-pressed={active}
              onClick={() => onFilterChange({ type: tab.value })}
              onClickCapture={(event) => movePill(event.currentTarget, true)}
              className={cn(
                "t-tab text-body-sm",
                active
                  ? "!text-foreground"
                  : "!text-muted-foreground hover:!text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" aria-label="Ordenar itens" />
          }
        >
          {SORT_LABELS[sort]}
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
              <span className="flex-1">{SORT_LABELS[option]}</span>
              {option === sort && (
                <CheckIcon aria-hidden="true" className="text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {isPending && (
        <span className="text-body-sm text-muted-foreground" aria-live="polite">
          Carregando item…
        </span>
      )}
    </section>
  );
}
