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
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { toastError, toastSuccess } from "@/components/states/Toast";
import { useDictionary } from "@/lib/i18n/client";

export function LandingItemTypes() {
  const t = useDictionary();
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [expandedPrompt, setExpandedPrompt] = useState(false);

  const promptContent = t.landing.itemTypes.promptContent;

  async function handleCopyPrompt() {
    const ok = await copyToClipboard(promptContent);
    if (ok) {
      setCopiedPrompt(true);
      toastSuccess(t.items.card.promptCopied);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } else {
      toastError(t.items.card.promptCopyFailed);
    }
  }

  return (
    <section id="tipos" className="py-16 md:py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="stagger" className="max-w-[52ch]">
          <h2 className="text-headline-lg t-stagger-line t-stagger-line--1 leading-tight font-[560] tracking-tight text-foreground">
            {t.landing.itemTypes.title}
          </h2>
          <p className="text-body-lg t-stagger-line t-stagger-line--2 mt-4 leading-relaxed text-pretty text-muted-foreground">
            {t.landing.itemTypes.subtitle}
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
                {t.landing.itemTypes.linkCardLabel}
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
                    <span>{t.items.card.openLink}</span>
                    <ExternalLinkIcon className="size-3" aria-hidden="true" />
                  </a>
                </div>

                <h3 className="text-headline-sm font-medium text-foreground">
                  Linear — Issue tracking for high-velocity teams
                </h3>

                <p className="text-body-sm mt-2 text-muted-foreground">
                  {t.landing.itemTypes.linkCardDescription}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5 pt-2">
                  <TagChip
                    name={t.landing.demo.tags.design}
                    colorToken="teal"
                  />
                  <TagChip
                    name={t.landing.demo.tags.productDesign}
                    colorToken="cyan"
                  />
                </div>
              </div>
            </div>

            <div className="text-body-sm mt-6 border-t border-border pt-4 text-muted-foreground">
              {t.landing.itemTypes.linkCaption}{" "}
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
                {t.landing.itemTypes.promptCardLabel}
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileTextIcon
                      className="size-3.5 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="text-metadata font-mono text-muted-foreground">
                      {t.landing.demo.promptBadge}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={handleCopyPrompt}
                    className="gap-1 text-xs"
                    aria-label={t.landing.itemTypes.copyPromptDemoAria}
                  >
                    {copiedPrompt ? (
                      <>
                        <CheckIcon className="size-3 text-brand-accent" />
                        <span className="font-semibold text-brand-accent">
                          {t.landing.demo.copied}
                        </span>
                      </>
                    ) : (
                      <>
                        <CopyIcon className="size-3" />
                        <span>{t.items.card.copyPrompt}</span>
                      </>
                    )}
                  </Button>
                </div>

                <h3 className="text-headline-sm font-medium text-foreground">
                  {t.landing.demo.items.item2.title}
                </h3>

                <p className="text-body-sm mt-2 text-muted-foreground">
                  {t.landing.itemTypes.promptCardDescription}
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
                        ? t.landing.itemTypes.collapse
                        : t.landing.itemTypes.expand}
                    </span>
                    {expandedPrompt ? (
                      <ChevronUpIcon className="size-3" />
                    ) : (
                      <ChevronDownIcon className="size-3" />
                    )}
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5 pt-2">
                  <TagChip
                    name={t.landing.demo.tags.desenvolvimento}
                    colorToken="blue"
                  />
                  <TagChip name={t.landing.demo.tags.ia} colorToken="emerald" />
                </div>
              </div>
            </div>

            <div className="text-body-sm mt-6 border-t border-border pt-4 text-muted-foreground">
              {t.landing.itemTypes.promptCardCaption}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
