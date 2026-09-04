"use client";

import { useState } from "react";
import {
  DEMO_TAGS,
  getItemsForTag,
  getDescendantTagIds,
} from "@/lib/landing/demo-data";
import {
  LinkIcon,
  FileTextIcon,
  LayersIcon,
  ExternalLinkIcon,
  CheckIcon,
  CopyIcon,
} from "lucide-react";
import { TagChip } from "@/components/tags/TagChip";
import { swatchClassFor } from "@/lib/tags/colors";
import { copyToClipboard } from "@/lib/clipboard";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/landing/ScrollReveal";

export function LandingTagRollup() {
  const [selectedTagId, setSelectedTagId] = useState<string>("skills");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredItems = getItemsForTag(selectedTagId);
  const currentTag =
    DEMO_TAGS.find((t) => t.id === selectedTagId) ?? DEMO_TAGS[0]!;

  const descendantIds = getDescendantTagIds(selectedTagId).filter(
    (id) => id !== selectedTagId,
  );

  const treeTags = DEMO_TAGS.filter(
    (t) =>
      t.id === "skills" ||
      t.parentId === "skills" ||
      t.parentId === "design" ||
      t.parentId === "desenvolvimento",
  );

  async function handleCopyPrompt(content: string, id: string) {
    const ok = await copyToClipboard(content);
    if (ok) {
      setCopiedId(id);
      toast.success("Prompt copiado.");
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  return (
    <section
      id="tag-rollup"
      className="border-y border-border bg-muted/20 py-28 md:py-40"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="stagger" className="max-w-[52ch]">
          <h2 className="text-display t-stagger-line t-stagger-line--1 leading-[1.05] font-[560] tracking-[-0.03em] text-foreground sm:text-[clamp(2.5rem,3.5vw,3rem)]">
            Organize uma vez e encontre por qualquer caminho depois.
          </h2>
          <p className="text-body-lg t-stagger-line t-stagger-line--2 mt-5 leading-relaxed text-pretty text-muted-foreground">
            Tags podem ter filhas, e um item pode pertencer a mais de uma. Ao
            abrir uma tag pai, o Muvuca reúne automaticamente os itens de toda a
            hierarquia, sem duplicar conteúdo.
          </p>
        </ScrollReveal>

        <ScrollReveal
          variant="panel"
          className="relative mt-20 grid grid-cols-1 gap-8 overflow-hidden rounded-xl border border-border bg-card p-4 shadow-xs sm:p-6 lg:grid-cols-[340px_1fr]"
        >
          {/* Subtle Muvuca Grid / Dot Pattern Layer */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-0 overflow-hidden [mask-image:radial-gradient(ellipse_85%_85%_at_50%_50%,#000_40%,transparent_100%)] opacity-60"
          >
            <svg
              className="absolute inset-0 h-full w-full stroke-border/70"
              width="100%"
              height="100%"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id="muvuca-tag-rollup-grid"
                  width="28"
                  height="28"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 28 0 L 0 0 0 28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="stroke-border/50"
                  />
                  <circle cx="28" cy="0" r="0.75" className="fill-border" />
                </pattern>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="url(#muvuca-tag-rollup-grid)"
              />
            </svg>
          </div>

          {/* Interactive Tag Tree */}
          <div className="relative z-10 flex flex-col gap-2 border-b border-border pb-6 lg:border-r lg:border-b-0 lg:pr-6 lg:pb-0">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-metadata font-semibold text-muted-foreground uppercase">
                Árvore de Tags (Clique para testar)
              </span>
              <LayersIcon
                className="size-3.5 text-muted-foreground"
                aria-hidden="true"
              />
            </div>

            <div className="flex flex-col gap-1">
              {treeTags.map((tag) => {
                const isSelected = tag.id === selectedTagId;
                const isDirectChild = tag.parentId === "skills";
                const isDeepChild =
                  tag.parentId === "design" ||
                  tag.parentId === "desenvolvimento";

                const paddingLeft = isDeepChild
                  ? "2.75rem"
                  : isDirectChild
                    ? "1.5rem"
                    : "0.75rem";

                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setSelectedTagId(tag.id)}
                    className={`group flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-all duration-(--motion-fast) ease-out-muvuca ${
                      isSelected
                        ? "bg-primary font-medium text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    style={{ paddingLeft }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-2 shrink-0 rounded-full transition-transform duration-(--motion-fast) ease-out-muvuca motion-reduce:transition-none",
                          swatchClassFor(tag.colorToken),
                          isSelected && "scale-125",
                        )}
                      />
                      <span className="truncate">{tag.name}</span>
                    </div>
                    <span
                      className={`text-metadata font-mono text-xs ${
                        isSelected
                          ? "font-semibold text-primary-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {tag.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rollup Result Demonstration */}
          <div className="relative z-10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-metadata text-muted-foreground">
                  Tag ativa:
                </span>
                <span className="rounded-md border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-brand-accent">
                  {currentTag.name}
                </span>
              </div>
              <span className="text-metadata font-mono text-muted-foreground">
                {filteredItems.length} itens agregados{" "}
                {descendantIds.length > 0
                  ? `(de ${descendantIds.length} subtags)`
                  : ""}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredItems.map((item) => {
                const domain =
                  item.type === "link" && item.url
                    ? new URL(item.url).hostname
                    : null;

                return (
                  <div
                    key={item.id}
                    className="flex min-h-40 flex-col justify-between rounded-lg border border-border bg-background p-4 shadow-xs transition-[border-color] duration-(--motion-fast) ease-out-muvuca hover:border-foreground/20"
                  >
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {item.type === "link" ? (
                            <LinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
                          ) : (
                            <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
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
                            onClick={() =>
                              handleCopyPrompt(item.contentPreview!, item.id)
                            }
                            className="h-6 gap-1 px-1.5"
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

                      <h3 className="text-headline-sm line-clamp-2 text-sm font-medium text-foreground">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-body-sm mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1 border-t border-border/40 pt-2">
                      {item.tagIds.map((tagId) => {
                        const tag = DEMO_TAGS.find((t) => t.id === tagId);
                        return tag ? (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => setSelectedTagId(tag.id)}
                            className="transition-opacity duration-(--motion-fast) ease-out-muvuca hover:opacity-80 motion-reduce:transition-none"
                            title={`Filtrar por ${tag.name}`}
                          >
                            <TagChip
                              name={tag.name}
                              colorToken={tag.colorToken}
                            />
                          </button>
                        ) : null;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
