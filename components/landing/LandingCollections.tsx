"use client";

import { useState } from "react";
import { TagChip } from "@/components/tags/TagChip";
import type { TagColorToken } from "@/lib/validation/tag";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/landing/ScrollReveal";

interface CollectionExample {
  title: string;
  countHint: string;
  tags: { name: string; color: TagColorToken }[];
  description: string;
}

export function LandingCollections() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const collections: CollectionExample[] = [
    {
      title: "Skills & Engenharia",
      countHint: "128 itens",
      tags: [
        { name: "Front-end", color: "violet" },
        { name: "Next.js", color: "blue" },
        { name: "Segurança", color: "emerald" },
      ],
      description:
        "Artigos técnicos, documentações e snippets essenciais para o fluxo diário de código.",
    },
    {
      title: "Design & Direção de Arte",
      countHint: "94 itens",
      tags: [
        { name: "Tipografia", color: "teal" },
        { name: "Branding", color: "pink" },
        { name: "Design System", color: "cyan" },
      ],
      description:
        "Referências visuais, catálogos editoriais e componentes de alta fidelidade.",
    },
    {
      title: "Prompts de IA",
      countHint: "42 itens",
      tags: [
        { name: "Code Review", color: "emerald" },
        { name: "Redação", color: "amber" },
        { name: "Refatoração", color: "lime" },
      ],
      description:
        "Instruções de sistema, templates de agentes e comandos reutilizáveis prontos para copiar.",
    },
    {
      title: "Lista de Desejos & Wishlist",
      countHint: "31 itens",
      tags: [
        { name: "Livros", color: "orange" },
        { name: "Hardware", color: "stone" },
        { name: "Presentes", color: "pink" },
      ],
      description:
        "Itens de compra e recomendações sem a bagunça de listas em múltiplos blocos de notas.",
    },
    {
      title: "Vídeos & Aulas",
      countHint: "56 itens",
      tags: [
        { name: "Palestras", color: "blue" },
        { name: "Tutoriais", color: "teal" },
        { name: "Podcasts", color: "purple" },
      ],
      description:
        "Gravações que você quer assistir com calma no fim de semana.",
    },
    {
      title: "Artigos & Ensaios",
      countHint: "67 itens",
      tags: [
        { name: "Filosofia", color: "stone" },
        { name: "Produto", color: "cyan" },
        { name: "História da Web", color: "amber" },
      ],
      description:
        "Textos longos e ensaios guardados para consulta futura e pesquisa.",
    },
  ];

  return (
    <section
      id="colecoes"
      className="border-y border-border bg-muted/20 py-28 md:py-40"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="stagger" className="max-w-[52ch]">
          <h2 className="text-display t-stagger-line t-stagger-line--1 leading-[1.05] font-[560] tracking-[-0.03em] text-foreground sm:text-[clamp(2.5rem,3.5vw,3rem)]">
            Você organiza cada coleção do seu jeito.
          </h2>
          <p className="text-body-lg t-stagger-line t-stagger-line--2 mt-5 leading-relaxed text-pretty text-muted-foreground">
            Crie a taxonomia que faz sentido para você e agrupe qualquer tipo de
            interesse. O Muvuca se molda ao seu acervo pessoal.
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
