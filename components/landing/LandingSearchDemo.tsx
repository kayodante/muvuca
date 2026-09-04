"use client";

import { useState } from "react";
import { DEMO_ITEMS, type DemoItem } from "@/lib/landing/demo-data";
import {
  SearchIcon,
  LinkIcon,
  FileTextIcon,
  XIcon,
  ExternalLinkIcon,
  CopyIcon,
  CheckIcon,
  CommandIcon,
} from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/landing/ScrollReveal";

interface LandingSearchDemoProps {
  onOpenCommandPalette?: () => void;
}

export function LandingSearchDemo({
  onOpenCommandPalette,
}: LandingSearchDemoProps) {
  const [query, setQuery] = useState("design");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const quickQueries = ["design", "prompt", "frontend", "linear", "tailwind"];

  const results = query.trim()
    ? DEMO_ITEMS.filter(
        (i) =>
          i.title.toLowerCase().includes(query.toLowerCase()) ||
          (i.description &&
            i.description.toLowerCase().includes(query.toLowerCase())) ||
          (i.contentPreview &&
            i.contentPreview.toLowerCase().includes(query.toLowerCase())) ||
          (i.url && i.url.toLowerCase().includes(query.toLowerCase())),
      )
    : DEMO_ITEMS;

  async function handleCopy(item: DemoItem) {
    if (!item.contentPreview) return;
    const ok = await copyToClipboard(item.contentPreview);
    if (ok) {
      setCopiedId(item.id);
      toast.success("Prompt copiado.");
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  // Helper to highlight matching text
  function highlightText(text: string, term: string) {
    if (!term.trim()) return text;
    const regex = new RegExp(
      `(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark
          key={i}
          className="rounded-xs bg-primary/30 px-0.5 font-semibold text-foreground"
        >
          {part}
        </mark>
      ) : (
        part
      ),
    );
  }

  return (
    <section id="busca" className="py-20 md:py-28">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="stagger" className="max-w-[52ch]">
          <h2 className="text-headline-lg t-stagger-line t-stagger-line--1 leading-tight font-[560] tracking-tight text-foreground">
            Você não precisa lembrar onde salvou.
          </h2>
          <p className="text-body-lg t-stagger-line t-stagger-line--2 mt-4 leading-relaxed text-pretty text-muted-foreground">
            Pesquise por título, domínio, descrição ou conteúdo e combine a
            busca com suas tags para reduzir rapidamente a biblioteca ao que
            importa.
          </p>
        </ScrollReveal>

        {/* Live Search Input Component with Quick Pills */}
        <ScrollReveal variant="panel" className="mt-16 max-w-3xl">
          <div className="relative overflow-hidden rounded-xl border border-border bg-card p-2 shadow-xs">
            <div className="flex items-center gap-3 px-3">
              <SearchIcon
                className="size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por título, domínio, descrição ou prompt..."
                className="text-body-md w-full bg-transparent py-2 text-foreground outline-none placeholder:text-muted-foreground"
                aria-label="Demonstração interativa de busca"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                  aria-label="Limpar busca"
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </div>

            {/* Subtle sweep loading indicator */}
            <div className="mt-1 h-0.5 w-full animate-search-sweep rounded-full bg-primary motion-reduce:animate-none" />
          </div>

          {/* Quick query suggestion chips */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-metadata text-muted-foreground">
              Testar consultas:
            </span>
            {quickQueries.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setQuery(term)}
                className={`text-metadata rounded-md px-2.5 py-1 transition-colors duration-(--motion-fast) ease-out-muvuca motion-reduce:transition-none ${
                  query.toLowerCase() === term
                    ? "bg-primary font-medium text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {term}
              </button>
            ))}

            {onOpenCommandPalette && (
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="text-metadata ml-auto hidden items-center gap-1 text-brand-accent hover:underline sm:inline-flex"
              >
                <CommandIcon className="size-3" />
                <span>Abrir Spotlight (⌘K)</span>
              </button>
            )}
          </div>

          {/* Results List */}
          <div className="mt-6 flex flex-col gap-3">
            <div className="text-metadata font-mono text-muted-foreground">
              {results.length}{" "}
              {results.length === 1
                ? "resultado encontrado"
                : "resultados encontrados"}
            </div>

            {results.length === 0 ? (
              <div className="text-body-sm rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
                Nenhum item corresponde à busca &quot;{query}&quot;.
              </div>
            ) : (
              results.map((item) => {
                const domain =
                  item.type === "link" && item.url
                    ? new URL(item.url).hostname
                    : null;

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-xs transition-colors duration-(--motion-fast) ease-out-muvuca hover:border-foreground/20"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/30 text-muted-foreground">
                        {item.type === "link" ? (
                          <LinkIcon className="size-4 shrink-0" />
                        ) : (
                          <FileTextIcon className="size-4 shrink-0" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-body-sm truncate font-medium text-foreground">
                          {highlightText(item.title, query)}
                        </h3>
                        <p className="text-metadata truncate text-muted-foreground">
                          {item.type === "link"
                            ? highlightText(domain ?? "", query)
                            : highlightText(
                                item.description ?? item.contentPreview ?? "",
                                query,
                              )}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3 pl-3">
                      <span className="text-metadata hidden font-mono text-xs text-muted-foreground uppercase sm:inline">
                        {item.type}
                      </span>

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
                          className="h-7 gap-1 px-2"
                          aria-label="Copiar prompt"
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
              })
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
