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
import { useDictionary } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/dictionaries/pt-BR";

interface ProblemStep {
  id: string;
  icon: typeof LayersIcon;
  title: string;
  description: string;
}

function problemSteps(t: Dictionary): ProblemStep[] {
  const s = t.landing.problem.steps;
  return [
    { id: "scattered", icon: LayersIcon, ...s.scattered },
    { id: "rigid", icon: FolderXIcon, ...s.rigid },
    { id: "lost", icon: SearchXIcon, ...s.lost },
    { id: "solution", icon: TargetIcon, ...s.solution },
  ];
}

function ProblemVisualScattered({ t }: { t: Dictionary }) {
  const v = t.landing.problem.visuals.scattered;
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
            {v.tabsOpen}
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
              {v.mobileNotes}
            </p>
            <p className="text-body-sm truncate font-medium text-foreground">
              {v.codeReviewTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-border/80 bg-background p-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/40 text-muted-foreground">
            <GlobeIcon className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-metadata font-mono text-muted-foreground">
              {v.desktopTabs}
            </p>
            <p className="text-body-sm truncate font-medium text-foreground">
              {v.uiPatternsTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-border/80 bg-background p-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/40 text-muted-foreground">
            <BookmarkIcon className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-metadata font-mono text-muted-foreground">
              {v.bookmarksOther}
            </p>
            <p className="text-body-sm truncate font-medium text-foreground">
              {v.tailwindDocsTitle}
            </p>
          </div>
        </div>
      </div>

      <div className="text-metadata flex items-center gap-2 border-t border-border/40 pt-3 font-mono text-muted-foreground">
        <AlertCircleIcon className="size-3.5 shrink-0 text-warning" />
        <span>{v.fragmented}</span>
      </div>
    </div>
  );
}

function ProblemVisualRigid({ t }: { t: Dictionary }) {
  const v = t.landing.problem.visuals.rigid;
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <span className="text-metadata font-mono text-muted-foreground uppercase">
          {v.treeLabel}
        </span>
        <span className="rounded bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
          {v.oneFolderPerItem}
        </span>
      </div>

      {/* Rigid tree mock */}
      <div className="my-4 space-y-1.5 font-mono text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>{v.bookmarksRoot}</span>
        </div>
        <div className="flex items-center gap-2 pl-4 text-muted-foreground">
          <span>{v.work}</span>
        </div>
        <div className="flex items-center gap-2 pl-8 text-muted-foreground">
          <span>{v.design}</span>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border bg-background p-2 pl-12 font-sans font-medium text-foreground">
          <span className="truncate">{v.designSystemTitle}</span>
          <span className="text-metadata font-mono text-[10px] text-muted-foreground">
            {v.stuckInDesign}
          </span>
        </div>
        <div className="flex items-center gap-2 pl-4 text-muted-foreground">
          <span>{v.personal}</span>
        </div>
        <div className="flex items-center gap-2 pl-8 text-muted-foreground">
          <span>{v.frontendEngineering}</span>
        </div>
      </div>

      <div className="text-body-sm flex items-start gap-2 rounded-lg border border-border/40 bg-muted/20 p-2.5 text-xs text-muted-foreground">
        <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0 text-warning" />
        <p>{v.caption}</p>
      </div>
    </div>
  );
}

function ProblemVisualLost({ t }: { t: Dictionary }) {
  const v = t.landing.problem.visuals.lost;
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <span className="text-metadata font-mono text-muted-foreground uppercase">
          {v.searchAttempt}
        </span>
        <span className="rounded bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
          {v.noMatch}
        </span>
      </div>

      <div className="my-4 space-y-3">
        {/* Mock search input with unsuccessful query */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <SearchXIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-body-sm font-mono text-xs text-foreground">
            {v.queryExample}
          </span>
        </div>

        {/* Cluttered unindexed list */}
        <div className="space-y-2 rounded-lg border border-dashed border-border/70 bg-muted/10 p-3">
          <div className="flex items-center justify-between opacity-50">
            <span className="text-body-sm truncate font-mono text-xs text-muted-foreground">
              {v.untitledGist}
            </span>
          </div>
          <div className="flex items-center justify-between opacity-50">
            <span className="text-body-sm truncate font-mono text-xs text-muted-foreground">
              {v.linkSavedOn}
            </span>
          </div>
          <div className="flex items-center justify-between opacity-50">
            <span className="text-body-sm truncate font-mono text-xs text-muted-foreground">
              {v.newTabAiTool}
            </span>
          </div>
        </div>
      </div>

      <div className="text-metadata flex items-center gap-2 border-t border-border/40 pt-3 font-mono text-muted-foreground">
        <SearchXIcon className="size-3.5 shrink-0 text-destructive" />
        <span>{v.caption}</span>
      </div>
    </div>
  );
}

function ProblemVisualMuvuca({ t }: { t: Dictionary }) {
  const v = t.landing.problem.visuals.muvuca;
  const demo = t.landing.demo;
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-metadata font-mono text-muted-foreground uppercase">
            Muvuca
          </span>
          <span className="rounded-md bg-primary/20 px-2 py-0.5 text-xs font-semibold text-brand-accent">
            {v.tagRollupActive}
          </span>
        </div>
        <span className="text-metadata font-mono text-muted-foreground">
          {v.instantRetrieval}
        </span>
      </div>

      <div className="my-4 space-y-3">
        {/* Instant search working */}
        <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-background px-3 py-2 shadow-2xs">
          <SearchIcon className="size-4 shrink-0 text-brand-accent" />
          <span className="text-body-sm font-medium text-foreground">
            {v.searchQuery}
          </span>
          <span className="text-metadata ml-auto rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            {v.itemsFound(3)}
          </span>
        </div>

        {/* Clean, multi-tagged card */}
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-metadata font-mono text-muted-foreground">
              {demo.promptBadge}
            </span>
            <span className="text-metadata flex items-center gap-1 font-mono text-[11px] text-brand-accent">
              <CheckIcon className="size-3" />
              {v.readyToCopy}
            </span>
          </div>
          <h4 className="text-headline-sm mt-1 text-xs font-semibold text-foreground">
            {demo.items.item2.title}
          </h4>
          <div className="mt-2 flex flex-wrap gap-1">
            <TagChip name={demo.tags.skills} colorToken="lime" />
            <TagChip name={demo.tags.desenvolvimento} colorToken="blue" />
            <TagChip name={v.iaTagShort} colorToken="emerald" />
          </div>
        </div>
      </div>

      <div className="text-metadata flex items-center gap-2 border-t border-border/40 pt-3 font-mono text-brand-accent">
        <TagIcon className="size-3.5 shrink-0" />
        <span>{v.caption}</span>
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
  const t = useDictionary();
  const PROBLEM_STEPS = problemSteps(t);
  const [activeStep, setActiveStep] = useState(0);
  const [visualState, setVisualState] = useState({ step: 0, open: true });
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const previousActiveStep = useRef(activeStep);

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

  useEffect(() => {
    if (previousActiveStep.current === activeStep) return;

    previousActiveStep.current = activeStep;
    setVisualState((current) => ({ ...current, open: false }));
    const frame = window.requestAnimationFrame(() => {
      setVisualState({ step: activeStep, open: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeStep]);

  const ActiveVisual =
    VISUAL_COMPONENTS[visualState.step] ?? VISUAL_COMPONENTS[0]!;

  return (
    <section id="problema" className="py-20 md:py-28">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <ScrollReveal
          variant="stagger"
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-headline-lg t-stagger-line t-stagger-line--1 leading-tight font-[560] tracking-tight text-balance text-foreground">
            {t.landing.problem.title}
          </h2>
          <p className="text-body-lg t-stagger-line t-stagger-line--2 mt-4 leading-relaxed text-balance text-muted-foreground">
            {t.landing.problem.subtitle}
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
                  data-step-state={isActive ? "active" : "inactive"}
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
          <div className="sticky top-28 overflow-hidden">
            <div className="t-panel-slide" data-open={visualState.open}>
              <ActiveVisual t={t} />
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
                  <Visual t={t} />
                </div>
              </div>
            );
          })}
        </ScrollReveal>
      </div>
    </section>
  );
}
