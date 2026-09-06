"use client";

import { useEffect, useRef, useState } from "react";
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

/** Hex Orbit dot matrix (https://dotmatrix.zzzzshawn.cloud/playground?loader=dotm-hex-1),
 * reimplemented by hand as ~19 CSS-driven dots instead of pulling in that
 * project's shared animation framework (two more modules and a 26KB
 * stylesheet meant for its 55+ loaders) for one 14px icon. A hex laid out
 * as 3-4-5-4-3 dot rows; the 12 outer-ring dots share one opacity keyframe
 * at half the ring's lap time, each delayed by its position on the ring --
 * two dots exactly opposite land in the same phase for free, which is what
 * gives the two simultaneous "chasers"; the center dot and the 6 remaining
 * inner dots just sit dim and static, same as the source loader. */
const HEX_ROWS = [3, 4, 5, 4, 3] as const;
const HEX_LAP_MS = 900;
const HEX_PERIMETER_ORDER = [
  "0,0",
  "0,1",
  "0,2",
  "1,3",
  "2,4",
  "3,3",
  "4,2",
  "4,1",
  "4,0",
  "3,0",
  "2,0",
  "1,0",
] as const;
const HEX_RING_INDEX = new Map<string, number>(
  HEX_PERIMETER_ORDER.map((id, index) => [id, index]),
);

function hexInnerDotOpacity(row: number, col: number) {
  if (row === 2 && col === 2) return 0.1; // center
  return col === 2 ? 0.2 : 0.18;
}

function HexOrbitIcon() {
  return (
    <span
      aria-hidden="true"
      data-icon="inline-start"
      className="inline-flex flex-col items-center justify-center gap-px"
    >
      {HEX_ROWS.map((count, row) => (
        <span key={row} className="flex justify-center gap-px">
          {Array.from({ length: count }, (_, col) => {
            const ringIndex = HEX_RING_INDEX.get(`${row},${col}`);
            return (
              <span
                key={col}
                className={cn(
                  "size-0.5 rounded-full bg-brand-accent",
                  ringIndex !== undefined &&
                    "animate-hex-orbit-pulse motion-reduce:[animation-duration:900ms]",
                )}
                style={
                  ringIndex !== undefined
                    ? {
                        animationDelay: `${-(ringIndex / HEX_PERIMETER_ORDER.length) * HEX_LAP_MS}ms`,
                      }
                    : { opacity: hexInnerDotOpacity(row, col) }
                }
              />
            );
          })}
        </span>
      ))}
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
          {refreshState === "done" ? (
            <CheckIcon aria-hidden="true" data-icon="inline-start" />
          ) : refreshState === "refreshing" ? (
            <HexOrbitIcon />
          ) : (
            <RefreshCwIcon aria-hidden="true" data-icon="inline-start" />
          )}
          {refreshState === "refreshing"
            ? "Atualizando"
            : refreshState === "done"
              ? "Atualizado"
              : "Atualizar pré-visualizações"}
        </Button>
      )}

      <div
        role="group"
        aria-label="Filtrar por tipo"
        className="flex items-center gap-0.5 rounded-lg bg-card p-[3px]"
      >
        {TYPE_TABS.map((tab) => {
          const active = type === tab.value;
          return (
            <button
              key={tab.label}
              type="button"
              aria-pressed={active}
              onClick={() => onFilterChange({ type: tab.value })}
              className={cn(
                "text-body-sm rounded-md px-3 py-1 transition-colors duration-(--motion-fast) ease-out-muvuca motion-reduce:transition-none",
                active
                  ? "border border-border bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
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
