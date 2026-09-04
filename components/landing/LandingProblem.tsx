"use client";

import { useState, useEffect, useRef } from "react";
import {
  LayersIcon,
  FolderXIcon,
  SearchXIcon,
  TargetIcon,
  CheckIcon,
  AlertCircleIcon,
  SearchIcon,
  TagIcon,
  FileTextIcon,
  GlobeIcon,
  BookmarkIcon,
} from "lucide-react";
import { TagChip } from "@/components/tags/TagChip";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/landing/ScrollReveal";

interface ProblemStep {
  id: string;
  icon: typeof LayersIcon;
  title: string;
  description: string;
}

const PROBLEM_STEPS: ProblemStep[] = [
  {
    id: "scattered",
    icon: LayersIcon,
    title: "Favoritos espalhados",
    description:
      "Links acabam presos em dezenas de abas, notas e ferramentas diferentes, sem um ponto central para recuperar tudo depois.",
  },
  {
    id: "rigid",
    icon: FolderXIcon,
    title: "Pastas que não acompanham sua cabeça",
    description:
      "Uma referência técnica ou visual quase sempre faz sentido em mais de um contexto. Pastas tradicionais obrigam você a escolher apenas uma gaveta.",
  },
  {
    id: "lost",
    icon: SearchXIcon,
    title: "O esforço de busca supera o conteúdo",
    description:
      "Quando a biblioteca cresce, lembrar em qual pasta ou dispositivo você guardou dá mais trabalho do que encontrar o que precisa.",
  },
  {
    id: "solution",
    icon: TargetIcon,
    title: "Recuperação imediata em qualquer contexto",
    description:
      "Tags hierárquicas e agregação automática (rollup) alimentam uma busca instantânea que varre título, descrição e prompts em milissegundos.",
  },
];

function ProblemVisualScattered() {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs">
      {/* Mock browser tabs header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-metadata font-mono text-muted-foreground">
            28 abas abertas
          </span>
          <span className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            +14
          </span>
        </div>
      </div>

      {/* Disconnected silos */}
      <div className="my-4 space-y-2.5">
        <div className="flex items-center gap-3 rounded-lg border border-border/80 bg-background p-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/40 text-muted-foreground">
            <FileTextIcon className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-metadata font-mono text-muted-foreground">
              Notas do celular
            </p>
            <p className="text-body-sm truncate font-medium text-foreground">
              System Prompt: Code Review
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-border/80 bg-background p-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/40 text-muted-foreground">
            <GlobeIcon className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-metadata font-mono text-muted-foreground">
              Abas do navegador (desktop)
            </p>
            <p className="text-body-sm truncate font-medium text-foreground">
              Linear UI Patterns & Architecture
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-border/80 bg-background p-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/40 text-muted-foreground">
            <BookmarkIcon className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-metadata font-mono text-muted-foreground">
              Favoritos / Outros
            </p>
            <p className="text-body-sm truncate font-medium text-foreground">
              Tailwind CSS v4 Documentation
            </p>
          </div>
        </div>
      </div>

      <div className="text-metadata flex items-center gap-2 border-t border-border/40 pt-3 font-mono text-muted-foreground">
        <AlertCircleIcon className="size-3.5 shrink-0 text-warning" />
        <span>Fragmentado em 3 dispositivos diferentes</span>
      </div>
    </div>
  );
}

function ProblemVisualRigid() {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <span className="text-metadata font-mono text-muted-foreground uppercase">
          Árvore Rígida Tradicional
        </span>
        <span className="rounded bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
          1 pasta por item
        </span>
      </div>

      {/* Rigid tree mock */}
      <div className="my-4 space-y-1.5 font-mono text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>📁 Favoritos</span>
        </div>
        <div className="flex items-center gap-2 pl-4 text-muted-foreground">
          <span>├── 📁 Trabalho</span>
        </div>
        <div className="flex items-center gap-2 pl-8 text-muted-foreground">
          <span>│ └── 📁 Design</span>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border bg-background p-2 pl-12 font-sans font-medium text-foreground">
          <span className="truncate">📄 Design System & Tokens</span>
          <span className="text-metadata font-mono text-[10px] text-muted-foreground">
            Preso em Design
          </span>
        </div>
        <div className="flex items-center gap-2 pl-4 text-muted-foreground">
          <span>└── 📁 Pessoal</span>
        </div>
        <div className="flex items-center gap-2 pl-8 text-muted-foreground">
          <span> └── 📁 Engenharia Front-end</span>
        </div>
      </div>

      <div className="text-body-sm flex items-start gap-2 rounded-lg border border-border/40 bg-muted/20 p-2.5 text-xs text-muted-foreground">
        <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0 text-warning" />
        <p>
          Este link é design e código ao mesmo tempo, mas a pasta só aceita um
          dos dois.
        </p>
      </div>
    </div>
  );
}

function ProblemVisualLost() {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <span className="text-metadata font-mono text-muted-foreground uppercase">
          Tentativa de Busca
        </span>
        <span className="rounded bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
          Sem correspondência
        </span>
      </div>

      <div className="my-4 space-y-3">
        {/* Mock search input with unsuccessful query */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <SearchXIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-body-sm font-mono text-xs text-foreground">
            &quot;prompt refatoração typescript&quot;
          </span>
        </div>

        {/* Cluttered unindexed list */}
        <div className="space-y-2 rounded-lg border border-dashed border-border/70 bg-muted/10 p-3">
          <div className="flex items-center justify-between opacity-50">
            <span className="text-body-sm truncate font-mono text-xs text-muted-foreground">
              Sem título (1), https://gist.github.com/...
            </span>
          </div>
          <div className="flex items-center justify-between opacity-50">
            <span className="text-body-sm truncate font-mono text-xs text-muted-foreground">
              Link salvo em 12/04/2024
            </span>
          </div>
          <div className="flex items-center justify-between opacity-50">
            <span className="text-body-sm truncate font-mono text-xs text-muted-foreground">
              Nova aba - Ferramenta IA
            </span>
          </div>
        </div>
      </div>

      <div className="text-metadata flex items-center gap-2 border-t border-border/40 pt-3 font-mono text-muted-foreground">
        <SearchXIcon className="size-3.5 shrink-0 text-destructive" />
        <span>
          O prompt está salvo em algum lugar, mas inacessível pela busca.
        </span>
      </div>
    </div>
  );
}

function ProblemVisualMuvuca() {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-metadata font-mono text-muted-foreground uppercase">
            Muvuca
          </span>
          <span className="rounded-md bg-primary/20 px-2 py-0.5 text-xs font-semibold text-brand-accent">
            Tag Rollup Ativo
          </span>
        </div>
        <span className="text-metadata font-mono text-muted-foreground">
          Recuperação instantânea
        </span>
      </div>

      <div className="my-4 space-y-3">
        {/* Instant search working */}
        <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-background px-3 py-2 shadow-2xs">
          <SearchIcon className="size-4 shrink-0 text-brand-accent" />
          <span className="text-body-sm font-medium text-foreground">
            refatoração
          </span>
          <span className="text-metadata ml-auto rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            3 itens encontrados
          </span>
        </div>

        {/* Clean, multi-tagged card */}
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-metadata font-mono text-muted-foreground">
              PROMPT
            </span>
            <span className="text-metadata flex items-center gap-1 font-mono text-[11px] text-brand-accent">
              <CheckIcon className="size-3" />
              Pronto para copiar
            </span>
          </div>
          <h4 className="text-headline-sm mt-1 text-xs font-semibold text-foreground">
            System Prompt: Senior Code Reviewer
          </h4>
          <div className="mt-2 flex flex-wrap gap-1">
            <TagChip name="Skills" colorToken="lime" />
            <TagChip name="Desenvolvimento" colorToken="blue" />
            <TagChip name="IA" colorToken="emerald" />
          </div>
        </div>
      </div>

      <div className="text-metadata flex items-center gap-2 border-t border-border/40 pt-3 font-mono text-brand-accent">
        <TagIcon className="size-3.5 shrink-0" />
        <span>
          Encontrado por qualquer uma das tags filhas ou pela tag pai.
        </span>
      </div>
    </div>
  );
}

const VISUAL_COMPONENTS = [
  ProblemVisualScattered,
  ProblemVisualRigid,
  ProblemVisualLost,
  ProblemVisualMuvuca,
];

export function LandingProblem() {
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    stepRefs.current.forEach((el, index) => {
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveStep(index);
            }
          });
        },
        {
          rootMargin: "-25% 0px -40% 0px",
          threshold: 0.2,
        },
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => {
      observers.forEach((o) => o.disconnect());
    };
  }, []);

  const ActiveVisual = VISUAL_COMPONENTS[activeStep] ?? VISUAL_COMPONENTS[0]!;

  return (
    <section id="problema" className="py-20 md:py-28">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <ScrollReveal
          variant="stagger"
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-headline-lg t-stagger-line t-stagger-line--1 leading-tight font-[560] tracking-tight text-balance text-foreground">
            O trabalho real começa quando você esquece onde guardou e precisa
            achar de novo.
          </h2>
          <p className="text-body-lg t-stagger-line t-stagger-line--2 mt-4 leading-relaxed text-balance text-muted-foreground">
            A maioria das ferramentas de bookmarking trata seus links como uma
            lista infinita e desordenada.
          </p>
        </ScrollReveal>

        {/* Desktop Sticky Scroll Reveal (lg: 2-column layout) */}
        <div className="mt-20 hidden lg:grid lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-14">
          {/* Left Column: Narrative steps scrolling naturally */}
          <div className="space-y-32 py-10">
            {PROBLEM_STEPS.map((p, index) => {
              const Icon = p.icon;
              const isActive = activeStep === index;

              return (
                <div
                  key={p.title}
                  ref={(el) => {
                    stepRefs.current[index] = el;
                  }}
                  className={cn(
                    "flex flex-col justify-between transition-all duration-(--motion-base) ease-out-muvuca",
                    isActive
                      ? "translate-x-0 opacity-100"
                      : "-translate-x-1 opacity-40",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg border border-border transition-colors duration-(--motion-fast)",
                      isActive
                        ? "border-primary/30 bg-primary/15 text-brand-accent"
                        : "bg-muted/20 text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </div>

                  <div className="mt-4">
                    <h3
                      className={cn(
                        "text-headline-sm font-semibold transition-colors duration-(--motion-fast)",
                        isActive ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {p.title}
                    </h3>
                    <p className="text-body-md mt-3 leading-relaxed text-muted-foreground">
                      {p.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Sticky preview container */}
          <div className="sticky top-28">
            <div
              key={activeStep}
              className="animate-in duration-(--motion-base) ease-out-muvuca fade-in-50 slide-in-from-bottom-2 motion-reduce:animate-none"
            >
              <ActiveVisual />
            </div>
          </div>
        </div>

        {/* Mobile / Tablet Linear Flow (< lg: stacked cards) */}
        <ScrollReveal variant="stagger" className="mt-16 space-y-8 lg:hidden">
          {PROBLEM_STEPS.map((p, index) => {
            const Icon = p.icon;
            const Visual = VISUAL_COMPONENTS[index]!;

            return (
              <div
                key={p.title}
                className={cn(
                  "t-stagger-line flex flex-col gap-5 rounded-xl border border-border bg-muted/10 p-5",
                  `t-stagger-line--${index + 1}`,
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/20 text-muted-foreground">
                    <Icon className="size-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-headline-sm text-base font-semibold text-foreground">
                      {p.title}
                    </h3>
                    <p className="text-body-sm mt-2 text-sm leading-relaxed text-muted-foreground">
                      {p.description}
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <Visual />
                </div>
              </div>
            );
          })}
        </ScrollReveal>
      </div>
    </section>
  );
}
