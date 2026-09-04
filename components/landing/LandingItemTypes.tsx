"use client";

import { useState } from "react";
import {
  LinkIcon,
  FileTextIcon,
  CopyIcon,
  CheckIcon,
  ExternalLinkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { TagChip } from "@/components/tags/TagChip";
import { copyToClipboard } from "@/lib/clipboard";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/landing/ScrollReveal";

export function LandingItemTypes() {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [expandedPrompt, setExpandedPrompt] = useState(false);

  const promptContent =
    "Atue como um Senior Code Reviewer. Analise o diff priorizando:\n1. Segurança de dados e integridade de RLS;\n2. Tipagem estrita em TypeScript sem any;\n3. Acessibilidade WCAG 2.2 AA (teclado e contraste);\n4. Ausência de queries SQL concatenadas.\n\nRetorne apontamentos objetivos categorizados por severidade.";

  async function handleCopyPrompt() {
    const ok = await copyToClipboard(promptContent);
    if (ok) {
      setCopiedPrompt(true);
      toast.success("Prompt copiado para a área de transferência.");
      setTimeout(() => setCopiedPrompt(false), 2000);
    } else {
      toast.error("Não foi possível copiar o prompt.");
    }
  }

  return (
    <section id="tipos" className="py-16 md:py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="stagger" className="max-w-[52ch]">
          <h2 className="text-headline-lg t-stagger-line t-stagger-line--1 leading-tight font-[560] tracking-tight text-foreground">
            Links e prompts convivem no mesmo acervo.
          </h2>
          <p className="text-body-lg t-stagger-line t-stagger-line--2 mt-4 leading-relaxed text-pretty text-muted-foreground">
            Cada tipo de item possui personalidade visual e ações contextuais
            próprias, sem quebrar o grid da biblioteca.
          </p>
        </ScrollReveal>

        <ScrollReveal
          variant="stagger"
          className="mt-20 grid grid-cols-1 gap-8 lg:grid-cols-2"
        >
          {/* Link Item Spec Card */}
          <div className="t-stagger-line t-stagger-line--1 flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-xs">
            <div>
              <div className="text-metadata mb-3 font-semibold text-muted-foreground uppercase">
                Link de Referência
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LinkIcon
                      className="size-3.5 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="text-metadata font-mono text-muted-foreground">
                      linear.app
                    </span>
                  </div>
                  <a
                    href="https://linear.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-metadata inline-flex items-center gap-1 text-muted-foreground transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground motion-reduce:transition-none"
                  >
                    <span>Abrir link</span>
                    <ExternalLinkIcon className="size-3" aria-hidden="true" />
                  </a>
                </div>

                <h3 className="text-headline-sm font-medium text-foreground">
                  Linear — Issue tracking for high-velocity teams
                </h3>

                <p className="text-body-sm mt-2 text-muted-foreground">
                  Referência de interface densa com navegação por teclado e
                  performance em milissegundos.
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5 pt-2">
                  <TagChip name="Design" colorToken="teal" />
                  <TagChip name="Product Design" colorToken="cyan" />
                </div>
              </div>
            </div>

            <div className="text-body-sm mt-6 border-t border-border pt-4 text-muted-foreground">
              O domínio aparece sozinho, em Geist Mono. A tag herda da
              hierarquia do item. Abrir o link usa sempre{" "}
              <code className="text-metadata text-foreground">
                rel=&quot;noopener noreferrer&quot;
              </code>
              .
            </div>
          </div>

          {/* Prompt Item Spec Card */}
          <div className="t-stagger-line t-stagger-line--2 flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-xs">
            <div>
              <div className="text-metadata mb-3 font-semibold text-muted-foreground uppercase">
                Prompt de IA &amp; Instrução
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileTextIcon
                      className="size-3.5 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="text-metadata font-mono text-muted-foreground">
                      PROMPT
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={handleCopyPrompt}
                    className="gap-1 text-xs"
                    aria-label="Copiar prompt demonstrativo"
                  >
                    {copiedPrompt ? (
                      <>
                        <CheckIcon className="size-3 text-brand-accent" />
                        <span className="font-semibold text-brand-accent">
                          Copiado
                        </span>
                      </>
                    ) : (
                      <>
                        <CopyIcon className="size-3" />
                        <span>Copiar prompt</span>
                      </>
                    )}
                  </Button>
                </div>

                <h3 className="text-headline-sm font-medium text-foreground">
                  System Prompt: Senior Code Reviewer
                </h3>

                <p className="text-body-sm mt-2 text-muted-foreground">
                  Instrução de sistema para auditoria de segurança OWASP e
                  consistência de tipos.
                </p>

                <div className="mt-3 border-t border-border/70 pt-2.5">
                  <pre
                    className={`text-metadata font-mono whitespace-pre-line text-muted-foreground ${
                      expandedPrompt ? "" : "line-clamp-3"
                    }`}
                  >
                    {promptContent}
                  </pre>
                  <button
                    type="button"
                    onClick={() => setExpandedPrompt(!expandedPrompt)}
                    className="text-metadata mt-2 inline-flex items-center gap-1 text-brand-accent hover:underline"
                  >
                    <span>
                      {expandedPrompt
                        ? "Recolher visualização"
                        : "Ver prompt completo"}
                    </span>
                    {expandedPrompt ? (
                      <ChevronUpIcon className="size-3" />
                    ) : (
                      <ChevronDownIcon className="size-3" />
                    )}
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5 pt-2">
                  <TagChip name="Desenvolvimento" colorToken="blue" />
                  <TagChip name="IA & Prompts" colorToken="emerald" />
                </div>
              </div>
            </div>

            <div className="text-body-sm mt-6 border-t border-border pt-4 text-muted-foreground">
              O preview mantém a formatação original, e copiar vai pro clipboard
              em um clique. Expandir mostra o prompt inteiro.
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
