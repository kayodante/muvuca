"use client";

import { useState } from "react";
import { TagChip } from "@/components/tags/TagChip";
import type { TagColorToken } from "@/lib/validation/tag";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { useDictionary } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/dictionaries/pt-BR";

interface CollectionExample {
  title: string;
  countHint: string;
  tags: { name: string; color: TagColorToken }[];
  description: string;
}

// Colors are a structural/design decision, not copy; kept alongside the
// translated text (`t.landing.collections.items.<key>`) by matching index.
const COLLECTION_COLORS = {
  skills: ["violet", "blue", "emerald"],
  design: ["teal", "pink", "cyan"],
  prompts: ["emerald", "amber", "lime"],
  wishlist: ["orange", "stone", "pink"],
  videos: ["blue", "teal", "purple"],
  articles: ["stone", "cyan", "amber"],
} satisfies Record<string, TagColorToken[]>;

function collectionsData(t: Dictionary): CollectionExample[] {
  const items = t.landing.collections.items;
  return (Object.keys(COLLECTION_COLORS) as (keyof typeof items)[]).map(
    (key) => {
      const item = items[key];
      const colors = COLLECTION_COLORS[key];
      return {
        title: item.title,
        countHint: item.countHint,
        description: item.description,
        tags: item.tags.map((name, i) => ({
          name,
          color: colors[i]!,
        })),
      };
    },
  );
}

export function LandingCollections() {
  const t = useDictionary();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const collections = collectionsData(t);

  return (
    <section
      id="colecoes"
      className="border-y border-border bg-muted/20 py-28 md:py-40"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="stagger" className="max-w-[52ch]">
          <h2 className="text-display t-stagger-line t-stagger-line--1 leading-[1.05] font-[560] tracking-[-0.03em] text-foreground sm:text-[clamp(2.5rem,3.5vw,3rem)]">
            {t.landing.collections.title}
          </h2>
          <p className="text-body-lg t-stagger-line t-stagger-line--2 mt-5 leading-relaxed text-pretty text-muted-foreground">
            {t.landing.collections.subtitle}
          </p>
        </ScrollReveal>

        <ScrollReveal
          variant="stagger"
          className="mt-20 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {collections.map((c, index) => {
            const isHovered = hoveredIndex === index;

            return (
              <div
                key={c.title}
                className={cn(
                  "t-stagger-line group relative p-1",
                  `t-stagger-line--${index + 1}`,
                )}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Contained highlight backdrop tracking the hovered card */}
                {isHovered && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 -z-0 animate-in rounded-2xl border border-border/80 bg-muted/40 duration-(--motion-fast) ease-out-muvuca fade-in-0 zoom-in-95 motion-reduce:animate-none"
                  />
                )}

                <div
                  className={cn(
                    "relative z-10 flex min-h-48 flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-xs transition-[border-color,box-shadow,transform] duration-(--motion-fast) ease-out-muvuca",
                    isHovered
                      ? "-translate-y-0.5 border-foreground/25 shadow-sm"
                      : "hover:border-foreground/20",
                  )}
                >
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-headline-sm font-semibold text-foreground">
                        {c.title}
                      </h3>
                      <span className="text-metadata font-mono text-muted-foreground">
                        {c.countHint}
                      </span>
                    </div>
                    <p className="text-body-sm mt-2 leading-relaxed text-muted-foreground">
                      {c.description}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
                    {c.tags.map((t) => (
                      <TagChip
                        key={t.name}
                        name={t.name}
                        colorToken={t.color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </ScrollReveal>
      </div>
    </section>
  );
}
