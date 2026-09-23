"use client";

import { useState } from "react";
import {
  FolderIcon,
  TagIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  Code2Icon,
  CheckCircle2Icon,
} from "lucide-react";
import { swatchClassFor } from "@/lib/tags/colors";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { useDictionary } from "@/lib/i18n/client";

export function LandingImport() {
  const t = useDictionary();
  const imp = t.landing.import;
  const [activeStage, setActiveStage] = useState<
    "source" | "parser" | "target"
  >("target");

  return (
    <section id="importacao" className="py-20 md:py-28">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="stagger" className="max-w-[52ch]">
          <h2 className="text-headline-lg t-stagger-line t-stagger-line--1 leading-tight font-[560] tracking-tight text-foreground">
            {imp.title}
          </h2>
          <p className="text-body-lg t-stagger-line t-stagger-line--2 mt-4 leading-relaxed text-pretty text-muted-foreground">
            {imp.subtitle}
          </p>
        </ScrollReveal>

        {/* Interactive Visual Mapping Showcase */}
        <ScrollReveal
          variant="panel"
          className="mt-20 rounded-xl border border-border bg-card p-6 shadow-xs sm:p-8"
        >
          {/* Stage Switcher Tabs */}
          <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-border/60 pb-4">
            <span className="text-metadata mr-2 text-muted-foreground">
              {imp.stagesLabel}
            </span>
            <button
              type="button"
              onClick={() => setActiveStage("source")}
              className={`text-metadata flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors duration-(--motion-fast) ease-out-muvuca motion-reduce:transition-none ${
                activeStage === "source"
                  ? "bg-secondary font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FolderIcon className="size-3.5" />
              <span>{imp.stage1}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveStage("parser")}
              className={`text-metadata flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors duration-(--motion-fast) ease-out-muvuca motion-reduce:transition-none ${
                activeStage === "parser"
                  ? "bg-secondary font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Code2Icon className="size-3.5" />
              <span>{imp.stage2}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveStage("target")}
              className={`text-metadata flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors duration-(--motion-fast) ease-out-muvuca motion-reduce:transition-none ${
                activeStage === "target"
                  ? "bg-primary font-medium text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TagIcon className="size-3.5" />
              <span>{imp.stage3}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_auto_1fr]">
            {/* Left Box: Browser HTML Bookmarks */}
            <div
              className={`rounded-lg border p-5 transition-[border-color,background-color] duration-(--motion-fast) ease-out-muvuca ${
                activeStage === "source"
                  ? "border-foreground/30 bg-muted/40"
                  : "border-border bg-muted/20"
              }`}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderIcon className="size-4 text-muted-foreground" />
                  <h3 className="text-body-sm font-semibold text-foreground">
                    {imp.sourceHeading}
                  </h3>
                </div>
                <span className="text-metadata font-mono text-muted-foreground">
                  {imp.sourceCount}
                </span>
              </div>

              <div className="text-metadata space-y-2 font-mono text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="text-foreground">{imp.folderDesign}</span>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span>{imp.folderInspiration}</span>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span>{imp.folderTools}</span>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-foreground">{imp.folderDev}</span>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span>{imp.folderReact}</span>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span>{imp.folderAi}</span>
                </div>
              </div>
            </div>

            {/* Central Transform Indicator */}
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/20 text-brand-accent">
                <ArrowRightIcon className="size-5" />
              </div>
              <span className="text-metadata font-mono text-muted-foreground">
                {imp.conversion}
              </span>
            </div>

            {/* Right Box: Muvuca Tag Tree */}
            <div
              className={`rounded-lg border p-5 transition-[border-color,background-color] duration-(--motion-fast) ease-out-muvuca ${
                activeStage === "target"
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-muted/20"
              }`}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TagIcon className="size-4 text-brand-accent" />
                  <h3 className="text-body-sm font-semibold text-foreground">
                    {imp.targetHeading}
                  </h3>
                </div>
                <span className="text-metadata font-mono font-medium text-brand-accent">
                  {imp.tagsCreated}
                </span>
              </div>

              <div className="text-metadata space-y-2 font-mono text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      swatchClassFor("teal"),
                    )}
                  />
                  <span className="font-semibold text-foreground">
                    {imp.tagDesign}
                  </span>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      swatchClassFor("pink"),
                    )}
                  />
                  <span>{imp.tagInspiration}</span>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      swatchClassFor("cyan"),
                    )}
                  />
                  <span>{imp.tagTools}</span>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      swatchClassFor("blue"),
                    )}
                  />
                  <span className="font-semibold text-foreground">
                    {imp.tagDev}
                  </span>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      swatchClassFor("violet"),
                    )}
                  />
                  <span>{imp.tagReact}</span>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      swatchClassFor("emerald"),
                    )}
                  />
                  <span>{imp.tagAi}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Local Parser Code Preview (when stage 2 is active) */}
          {activeStage === "parser" && (
            <div className="mt-6 rounded-lg border border-border bg-background p-4">
              <div className="text-metadata mb-2 flex items-center gap-2 font-mono text-muted-foreground">
                <ShieldCheckIcon className="size-4 text-brand-accent" />
                <span>{imp.parserNote}</span>
              </div>
              <pre className="text-metadata overflow-x-auto font-mono text-foreground">
                {imp.parserCode}
              </pre>
            </div>
          )}

          {/* Bottom Security / UX note */}
          <div className="text-body-sm mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-4 text-muted-foreground">
            <CheckCircle2Icon className="size-4 shrink-0 text-brand-accent" />
            <span>{imp.caption}</span>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
