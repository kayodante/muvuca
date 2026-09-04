"use client";

import { useState } from "react";
import Link from "next/link";
import DarkVeil from "@/components/DarkVeil";
import { buttonVariants, Button } from "@/components/ui/button";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  SearchIcon,
  LinkIcon,
  FileTextIcon,
  ExternalLinkIcon,
  LayoutGridIcon,
  ListIcon,
  CopyIcon,
  CheckIcon,
  FilterIcon,
} from "lucide-react";
import {
  DEMO_ITEMS,
  DEMO_TAGS,
  getItemsForTag,
  type DemoItem,
} from "@/lib/landing/demo-data";
import { TagChip } from "@/components/tags/TagChip";
import { swatchClassFor } from "@/lib/tags/colors";
import { copyToClipboard } from "@/lib/clipboard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/landing/ScrollReveal";

interface LandingHeroProps {
  onOpenSearch?: () => void;
}

export function LandingHero({ onOpenSearch }: LandingHeroProps) {
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const displayedItems = selectedTagId
    ? getItemsForTag(selectedTagId)
    : DEMO_ITEMS.slice(0, 4);

  async function handleCopyPrompt(item: DemoItem, e: React.MouseEvent) {
    e.stopPropagation();
    if (!item.contentPreview) return;
    const ok = await copyToClipboard(item.contentPreview);
    if (ok) {
      setCopiedId(item.id);
      toast.success("Prompt copiado.");
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  return (
    <section
      id="inicio"
      className="relative overflow-hidden border-b border-border pt-12 pb-20 md:pt-20 md:pb-28"
    >
      {/* DarkVeil Full-Bleed Hero Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-0 h-full w-full overflow-hidden"
      >
        <DarkVeil
          hueShift={85}
          noiseIntensity={0}
          scanlineIntensity={0}
          speed={0.8}
          scanlineFrequency={0}
          warpAmount={1}
          resolutionScale={0.5}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Editorial Header - Direct and Authoritative */}
        <ScrollReveal
          variant="stagger"
          className="mx-auto max-w-4xl text-center"
        >
          <h1 className="text-display t-stagger-line t-stagger-line--1 leading-[0.98] font-[560] tracking-[-0.035em] text-balance text-foreground sm:text-[clamp(2.75rem,5.5vw,4.75rem)]">
            Organize a muvuca que você salva na internet.
          </h1>

          <p className="text-body-lg t-stagger-line t-stagger-line--2 mx-auto mt-6 max-w-2xl text-balance text-muted-foreground">
            Links e prompts organizados numa biblioteca visual feita para você
            encontrar de novo o que decidiu guardar.
          </p>

          <div className="t-stagger-line t-stagger-line--3 mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "gap-2 px-6 shadow-sm",
              )}
            >
              Começar
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Link>
            <a
              href="#demo"
              className={cn(
                buttonVariants({ variant: "secondary", size: "lg" }),
                "gap-2 px-6",
              )}
            >
              Ver como funciona
              <ChevronDownIcon
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            </a>
          </div>
        </ScrollReveal>

        {/* Realistic Interactive Product Showcase Board */}
        <ScrollReveal
          variant="panel"
          id="demo"
          className="mt-16 overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        >
          {/* Topbar Mock */}
          <div className="flex h-14 items-center justify-between border-b border-border bg-muted/30 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <span className="size-2.5 rounded-full bg-border" />
                <span className="size-2.5 rounded-full bg-border" />
                <span className="size-2.5 rounded-full bg-border" />
              </div>
              <span className="text-metadata hidden font-mono text-muted-foreground sm:inline">
                muvuca.app/library
              </span>
            </div>

            {/* Interactive Search Launcher Button */}
            <div className="flex max-w-md flex-1 items-center justify-center px-4">
              <button
                type="button"
                onClick={onOpenSearch}
                className="text-body-sm flex h-9 w-full max-w-sm items-center justify-between rounded-lg border border-border bg-background px-3 text-muted-foreground shadow-xs transition-colors duration-(--motion-fast) ease-out-muvuca hover:bg-muted/40"
                aria-label="Abrir busca rápida da demonstração"
              >
                <div className="flex items-center gap-2">
                  <SearchIcon className="size-3.5" aria-hidden="true" />
                  <span className="truncate">Buscar na biblioteca...</span>
                </div>
                <kbd className="text-metadata hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-muted-foreground sm:inline-block">
                  ⌘ K
                </kbd>
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`rounded-md p-1.5 transition-colors duration-(--motion-fast) ease-out-muvuca motion-reduce:transition-none ${
                  viewMode === "grid"
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label="Visualização em grade"
              >
                <LayoutGridIcon className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`rounded-md p-1.5 transition-colors duration-(--motion-fast) ease-out-muvuca motion-reduce:transition-none ${
                  viewMode === "list"
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label="Visualização em lista"
              >
                <ListIcon className="size-4" />
              </button>
            </div>
          </div>

          {/* Body: Sidebar + Dynamic Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
            {/* Interactive Sidebar Mock */}
            <aside className="hidden border-r border-border bg-background/50 p-4 lg:block">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-metadata font-semibold text-muted-foreground uppercase">
                  Tags
                </span>
                {selectedTagId && (
                  <button
                    type="button"
                    onClick={() => setSelectedTagId(null)}
                    className="text-metadata text-xs text-brand-accent hover:underline"
                  >
                    Limpar
                  </button>
                )}
              </div>

              <div className="text-body-sm flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedTagId(null)}
                  className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-left transition-colors duration-(--motion-fast) ease-out-muvuca motion-reduce:transition-none ${
                    selectedTagId === null
                      ? "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-primary" />
                    <span>Todos os itens</span>
                  </div>
                  <span className="text-metadata font-mono text-muted-foreground">
                    {DEMO_ITEMS.length}
                  </span>
                </button>

                {DEMO_TAGS.slice(0, 7).map((tag) => {
                  const isSelected = selectedTagId === tag.id;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() =>
                        setSelectedTagId(isSelected ? null : tag.id)
                      }
                      className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-left transition-colors duration-(--motion-fast) ease-out-muvuca motion-reduce:transition-none ${
                        isSelected
                          ? "bg-secondary font-medium text-foreground"
                          : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                      }`}
                      style={{
                        paddingLeft: tag.parentId ? "1.5rem" : "0.625rem",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            swatchClassFor(tag.colorToken),
                          )}
                        />
                        <span className="truncate">{tag.name}</span>
                      </div>
                      <span className="text-metadata font-mono text-muted-foreground">
                        {tag.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Gallery Content Mock */}
            <div className="bg-muted/10 p-4 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-headline-sm font-medium">
                    Biblioteca
                  </span>
                  <span className="text-metadata font-mono text-muted-foreground">
                    ({displayedItems.length}{" "}
                    {displayedItems.length === 1
                      ? "item exibido"
                      : "itens exibidos"}
                    {selectedTagId ? " pelo filtro" : ""})
                  </span>
                </div>

                {selectedTagId && (
                  <div className="flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-brand-accent">
                    <FilterIcon className="size-3" />
                    <span>
                      Filtro ativo:{" "}
                      {DEMO_TAGS.find((t) => t.id === selectedTagId)?.name}
                    </span>
                  </div>
                )}
              </div>

              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {displayedItems.map((item) => {
                    const domain =
                      item.type === "link" && item.url
                        ? new URL(item.url).hostname
                        : null;

                    return (
                      <article
                        key={item.id}
                        className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-xs transition-[border-color,box-shadow] duration-(--motion-fast) ease-out-muvuca hover:border-foreground/20 hover:shadow-sm"
                      >
                        <div>
                          <div className="mb-3 flex items-center justify-between gap-2">
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
                              <span className="text-metadata font-mono text-muted-foreground">
                                {item.type === "link" ? domain : "PROMPT"}
                              </span>
                            </div>

                            {item.type === "link" && item.url ? (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-muted-foreground transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground motion-reduce:transition-none"
                                aria-label={`Abrir ${item.title} em nova aba`}
                              >
                                <ExternalLinkIcon
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                              </a>
                            ) : item.type === "prompt" &&
                              item.contentPreview ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                onClick={(e) => handleCopyPrompt(item, e)}
                                className="h-6 gap-1 px-1.5 text-xs"
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
                                    <span className="text-metadata">
                                      Copiar
                                    </span>
                                  </>
                                )}
                              </Button>
                            ) : null}
                          </div>

                          <h3 className="text-headline-sm line-clamp-2 font-medium">
                            {item.title}
                          </h3>

                          {item.description && (
                            <p className="text-body-sm mt-2 line-clamp-2 text-muted-foreground">
                              {item.description}
                            </p>
                          )}

                          {item.type === "prompt" && item.contentPreview && (
                            <div className="mt-3 border-t border-border/70 pt-2.5">
                              <pre className="text-metadata line-clamp-3 font-mono whitespace-pre-line text-muted-foreground">
                                {item.contentPreview}
                              </pre>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-1.5 pt-2">
                          {item.tagIds.slice(0, 3).map((tagId) => {
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
              ) : (
                /* Compact List View Mode */
                <div className="flex flex-col gap-2">
                  {displayedItems.map((item) => {
                    const domain =
                      item.type === "link" && item.url
                        ? new URL(item.url).hostname
                        : null;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors duration-(--motion-fast) ease-out-muvuca hover:border-foreground/20"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {item.type === "link" ? (
                            <LinkIcon className="size-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-body-sm truncate font-medium">
                                {item.title}
                              </h4>
                              <span className="text-metadata shrink-0 font-mono text-muted-foreground">
                                {item.type === "link" ? domain : "PROMPT"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3 pl-2">
                          <div className="hidden items-center gap-1 sm:flex">
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
                              onClick={(e) => handleCopyPrompt(item, e)}
                              className="h-7 gap-1 px-2 text-xs"
                            >
                              {copiedId === item.id ? (
                                <CheckIcon className="size-3 text-brand-accent" />
                              ) : (
                                <CopyIcon className="size-3" />
                              )}
                              <span className="text-metadata">Copiar</span>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
