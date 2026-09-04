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

export function LandingImport() {
  const [activeStage, setActiveStage] = useState<
    "source" | "parser" | "target"
  >("target");

  return (
    <section id="importacao" className="py-20 md:py-28">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="stagger" className="max-w-[52ch]">
          <h2 className="text-headline-lg t-stagger-line t-stagger-line--1 leading-tight font-[560] tracking-tight text-foreground">
            Traga seus favoritos sem perder a estrutura de pastas.
          </h2>
          <p className="text-body-lg t-stagger-line t-stagger-line--2 mt-4 leading-relaxed text-pretty text-muted-foreground">
            Importe os favoritos do navegador e transforme pastas e subpastas em
            uma hierarquia de tags antes de confirmar o que entra na biblioteca.
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
              Etapas da migração:
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
              <span>1. Arquivo de Favoritos</span>
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
              <span>2. Análise Segura no Navegador</span>
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
              <span>3. Árvore de Tags Muvuca</span>
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
                    Favoritos do Navegador (.html)
                  </h3>
                </div>
                <span className="text-metadata font-mono text-muted-foreground">
                  114 links
                </span>
              </div>

              <div className="text-metadata space-y-2 font-mono text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="text-foreground">📁 Design</span>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span>↳ 📁 Inspiração (54 links)</span>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span>↳ 📁 Ferramentas (18 links)</span>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-foreground">📁 Desenvolvimento</span>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span>↳ 📁 React &amp; Next.js (24 links)</span>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span>↳ 📁 IA &amp; LLMs (18 links)</span>
                </div>
              </div>
            </div>

            {/* Central Transform Indicator */}
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/20 text-brand-accent">
                <ArrowRightIcon className="size-5" />
              </div>
              <span className="text-metadata font-mono text-muted-foreground">
                Conversão 1:1
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
                    Estrutura de Tags no Muvuca
                  </h3>
                </div>
                <span className="text-metadata font-mono font-medium text-brand-accent">
                  6 tags criadas
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
                    # Design
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
                  <span># Inspiração [tag filha]</span>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      swatchClassFor("cyan"),
                    )}
                  />
                  <span># Ferramentas [tag filha]</span>
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
                    # Desenvolvimento
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
                  <span># React &amp; Next.js [tag filha]</span>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      swatchClassFor("emerald"),
                    )}
                  />
                  <span># IA &amp; LLMs [tag filha]</span>
                </div>
              </div>
            </div>
          </div>

          {/* Local Parser Code Preview (when stage 2 is active) */}
          {activeStage === "parser" && (
            <div className="mt-6 rounded-lg border border-border bg-background p-4">
              <div className="text-metadata mb-2 flex items-center gap-2 font-mono text-muted-foreground">
                <ShieldCheckIcon className="size-4 text-brand-accent" />
                <span>
                  Parser inerte no cliente (sem SSRF, sem envio de HTML bruto)
                </span>
              </div>
              <pre className="text-metadata overflow-x-auto font-mono text-foreground">
                {`const parser = new DOMParser();
const doc = parser.parseFromString(rawHtml, 'text/html');
// Extração pura de textContent e atributos href validados (apenas http/https)
// O servidor recebe apenas o DTO estruturado de tags e links.`}
              </pre>
            </div>
          )}

          {/* Bottom Security / UX note */}
          <div className="text-body-sm mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-4 text-muted-foreground">
            <CheckCircle2Icon className="size-4 shrink-0 text-brand-accent" />
            <span>
              O arquivo é processado localmente. Antes de salvar, você vê
              quantos itens são válidos e quantos são duplicados.
            </span>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
