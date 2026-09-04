"use client";

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
  return (
    <section
      aria-label="Filtros e ordenação"
      className="flex flex-wrap items-center gap-3"
    >
      {canRefreshPreviews && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefreshPreviews}
          pending={isRefreshingPreviews}
        >
          <RefreshCwIcon aria-hidden="true" data-icon="inline-start" />
          Atualizar pré-visualizações
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
