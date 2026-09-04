"use client";

import { useState, useRef, useEffect } from "react";
import { DEMO_ITEMS, DEMO_TAGS, type DemoItem } from "@/lib/landing/demo-data";
import { TagChip } from "@/components/tags/TagChip";
import {
  LinkIcon,
  FileTextIcon,
  ExternalLinkIcon,
  CopyIcon,
  CheckIcon,
} from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/landing/ScrollReveal";

const FILTER_TABS = [
  { id: "all", label: "Todos" },
  { id: "link", label: "Links" },
  { id: "prompt", label: "Prompts" },
] as const;

type FilterType = (typeof FILTER_TABS)[number]["id"];

export function LandingGalleryOverview() {
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    const activeEl = tabRefs.current.get(filterType);
    if (activeEl) {
      setPillStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
      });
    }
  }, [filterType]);

  const displayedItems = DEMO_ITEMS.filter((item) => {
    if (filterType === "all") return true;
    return item.type === filterType;
  }).slice(0, 6);

  async function handleCopy(item: DemoItem) {
    if (!item.contentPreview) return;
    const ok = await copyToClipboard(item.contentPreview);
    if (ok) {
      setCopiedId(item.id);
      toast.success("Prompt copiado.");
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  function handleTabKeyDown(e: React.KeyboardEvent, currentId: FilterType) {
    const currentIndex = FILTER_TABS.findIndex((t) => t.id === currentId);
    let nextIndex = -1;

    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % FILTER_TABS.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + FILTER_TABS.length) % FILTER_TABS.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = FILTER_TABS.length - 1;
    }

    if (nextIndex !== -1) {
      e.preventDefault();
      const nextTab = FILTER_TABS[nextIndex]!;
      setFilterType(nextTab.id);
      const el = tabRefs.current.get(nextTab.id);
      el?.focus();
    }
  }

  return (
    <section id="visao" className="py-16 md:py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="stagger" className="max-w-[52ch]">
          <h2 className="text-headline-lg t-stagger-line t-stagger-line--1 leading-tight font-[560] tracking-tight text-foreground">
            Uma biblioteca que continua legível quando cresce.
          </h2>
          <p className="text-body-lg t-stagger-line t-stagger-line--2 mt-4 leading-relaxed text-pretty text-muted-foreground">
            O Muvuca reúne seus itens em uma galeria visual, mantém a busca
            sempre por perto e usa tags para dar contexto sem transformar sua
            coleção em uma árvore impossível de navegar.
          </p>
        </ScrollReveal>

        {/* Dense, calm editorial gallery showcase */}
        <ScrollReveal
          variant="panel"
          className="mt-12 rounded-xl border border-border bg-muted/20 p-4 sm:p-6"
        >
          {/* Gallery Header with Type Filter */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-label-md text-foreground">
                Acervo em Destaque
              </span>
              <span className="text-metadata font-mono text-muted-foreground">
                ({displayedItems.length} itens)
              </span>
            </div>

            {/* Animated Filter Tabs */}
            <div
              role="tablist"
              aria-label="Filtrar acervo por tipo"
              className="relative flex items-center gap-1 rounded-lg border border-border bg-background p-0.5"
            >
              {/* Sliding active pill indicator */}
              {pillStyle.width > 0 && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0.5 bottom-0.5 rounded bg-secondary transition-all duration-(--motion-base) ease-out-muvuca motion-reduce:transition-none"
                  style={{
                    left: `${pillStyle.left}px`,
                    width: `${pillStyle.width}px`,
                  }}
                />
              )}

              {FILTER_TABS.map((tab) => {
                const isSelected = filterType === tab.id;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      if (el) tabRefs.current.set(tab.id, el);
                      else tabRefs.current.delete(tab.id);
                    }}
                    role="tab"
                    id={`tab-filter-${tab.id}`}
                    aria-selected={isSelected}
                    aria-controls="gallery-cards-grid"
                    tabIndex={isSelected ? 0 : -1}
                    type="button"
                    onClick={() => setFilterType(tab.id)}
                    onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                    className={cn(
                      "text-metadata relative z-10 rounded px-2.5 py-1 transition-colors duration-(--motion-fast) focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden",
                      isSelected
                        ? "font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            key={filterType}
            id="gallery-cards-grid"
            role="tabpanel"
            aria-labelledby={`tab-filter-${filterType}`}
            className="grid animate-in grid-cols-1 gap-4 duration-(--motion-base) ease-out-muvuca fade-in-50 slide-in-from-bottom-1 motion-reduce:animate-none sm:grid-cols-2 lg:grid-cols-3"
          >
            {displayedItems.map((item) => {
              const domain =
                item.type === "link" && item.url
                  ? new URL(item.url).hostname
                  : null;

              return (
                <article
                  key={item.id}
                  className="flex min-h-52 flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-xs transition-[border-color,box-shadow] duration-(--motion-fast) ease-out-muvuca hover:border-foreground/20 hover:shadow-sm"
                >
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {item.type === "link" ? (
                          <LinkIcon
                            className="size-3.5 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                        ) : (
                          <FileTextIcon
                            className="size-3.5 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                        )}
                        <span className="text-metadata truncate font-mono text-muted-foreground">
                          {item.type === "link" ? domain : "PROMPT"}
                        </span>
                      </div>

                      {item.type === "link" && item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-muted-foreground hover:text-foreground"
                          aria-label={`Abrir ${item.title}`}
                        >
                          <ExternalLinkIcon className="size-3.5" />
                        </a>
                      ) : item.type === "prompt" && item.contentPreview ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => handleCopy(item)}
                          className="h-6 gap-1 px-1.5"
                          aria-label="Copiar prompt"
                        >
                          {copiedId === item.id ? (
                            <>
                              <CheckIcon className="size-3 text-brand-accent" />
                              <span className="text-metadata text-brand-accent">
                                Copiado
                              </span>
                            </>
                          ) : (
                            <>
                              <CopyIcon className="size-3" />
                              <span className="text-metadata">Copiar</span>
                            </>
                          )}
                        </Button>
                      ) : null}
                    </div>

                    <h3 className="text-headline-sm line-clamp-2 text-sm font-medium text-foreground">
                      {item.title}
                    </h3>

                    {item.description && (
                      <p className="text-body-sm mt-2 line-clamp-2 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    )}

                    {item.type === "prompt" && item.contentPreview && (
                      <div className="mt-2.5 border-t border-border/70 pt-2">
                        <pre className="text-metadata line-clamp-3 font-mono whitespace-pre-line text-muted-foreground">
                          {item.contentPreview}
                        </pre>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1 pt-2">
                    {item.tagIds.slice(0, 2).map((tagId) => {
                      const tag = DEMO_TAGS.find((t) => t.id === tagId);
                      return tag ? (
                        <TagChip
                          key={tag.id}
                          name={tag.name}
                          colorToken={tag.colorToken}
                        />
                      ) : null;
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
