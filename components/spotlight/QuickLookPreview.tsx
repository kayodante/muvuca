"use client";

import { useState } from "react";
import {
  ExternalLinkIcon,
  CopyIcon,
  CheckIcon,
  XIcon,
  LinkIcon,
  FileTextIcon,
  Code2Icon,
} from "lucide-react";

import type { LibraryItemSummary } from "@/lib/database/queries/items";
import type { FlatTag } from "@/lib/tags/tree";
import type { Tag } from "@/lib/database/queries/tags";
import { swatchClassFor } from "@/lib/tags/colors";
import { copyToClipboard } from "@/lib/clipboard";
import { getItemDetails } from "@/lib/actions/items";
import { normalizeHttpUrl } from "@/lib/validation/item";
import { Button } from "@/components/ui/button";
import { useHighlightedLines } from "@/components/items/useHighlightedLines";
import { LinkPreviewMedia } from "@/components/items/LinkPreviewMedia";
import { useDictionary } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { toastError, toastSuccess } from "@/components/states/Toast";

export function QuickLookPreview({
  item,
  tags,
  onClose,
}: {
  item: LibraryItemSummary;
  tags: (FlatTag | Tag)[];
  onClose: () => void;
}) {
  const t = useDictionary();
  const [copied, setCopied] = useState(false);

  // Associated tags
  const associatedTags = tags.filter((tag) => item.tagIds?.includes(tag.id));

  // Extract preview values safely
  const isLink = item.type === "link";
  const isPrompt = item.type === "prompt";
  const isCode = item.type === "code_component";

  const url = isLink ? item.url : null;
  const content = isPrompt || isCode ? item.contentPreview : "";
  const language = isCode ? item.language : null;

  const lines = useHighlightedLines(content, language ?? null);

  async function handleCopy(textToCopy: string, successMessage: string) {
    const ok = await copyToClipboard(textToCopy);
    if (ok) {
      setCopied(true);
      toastSuccess(successMessage);
      setTimeout(() => setCopied(false), 2000);
    } else {
      toastError(t.spotlight.quickLook.copyGenericFailed);
    }
  }

  async function handleCopyContent(
    itemId: string,
    fallback: string,
    successMessage: string,
  ) {
    const fullContentPromise = getItemDetails(itemId).then((res) => {
      if (
        res.ok &&
        (res.data.type === "prompt" || res.data.type === "code_component")
      ) {
        return res.data.content;
      }
      return fallback;
    });

    const ok = await copyToClipboard(fullContentPromise);
    if (ok) {
      setCopied(true);
      toastSuccess(successMessage);
      setTimeout(() => setCopied(false), 2000);
    } else {
      toastError(t.spotlight.quickLook.copyGenericFailed);
    }
  }

  let domain: string | null = null;
  if (isLink && url) {
    try {
      domain = new URL(url).hostname;
    } catch {
      domain = url;
    }
  }

  return (
    <div
      role="region"
      aria-label={t.spotlight.quickLook.regionLabel}
      className="flex h-full w-full flex-col border-t border-border bg-card p-4 sm:w-80 sm:border-t-0 sm:border-l sm:p-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          {isLink && (
            <div className="flex size-7 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
              <LinkIcon className="size-3.5" aria-hidden="true" />
            </div>
          )}
          {isPrompt && (
            <div className="flex size-7 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
              <FileTextIcon className="size-3.5" aria-hidden="true" />
            </div>
          )}
          {isCode && (
            <div className="flex size-7 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
              <Code2Icon className="size-3.5" aria-hidden="true" />
            </div>
          )}
          <span className="text-brand-pixel rounded bg-muted/60 px-1.5 py-0.5 text-foreground">
            {isLink
              ? t.spotlight.badges.link
              : isPrompt
                ? t.spotlight.badges.prompt
                : t.spotlight.badges.code}
          </span>
          {language && (
            <span className="text-metadata font-mono text-muted-foreground uppercase">
              {language}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t.spotlight.quickLook.close}
        >
          <XIcon className="size-4" />
        </button>
      </div>

      {/* Content scroll area */}
      <div className="flex-1 overflow-y-auto py-3">
        <h3 className="text-headline-sm font-semibold text-foreground">
          {item.title}
        </h3>

        {domain && (
          <p className="text-metadata mt-1 font-mono text-muted-foreground">
            {domain}
          </p>
        )}

        {item.description && (
          <p className="text-body-sm mt-2 text-muted-foreground">
            {item.description}
          </p>
        )}

        {/* Tags */}
        {associatedTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {associatedTags.map((tag) => (
              <span
                key={tag.id}
                className="text-metadata inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 rounded-full",
                    swatchClassFor(tag.colorToken),
                  )}
                />
                <span className="text-foreground">{tag.name}</span>
              </span>
            ))}
          </div>
        )}

        {/* Content body preview */}
        {isPrompt && content && (
          <div className="mt-4 rounded-md border border-border bg-secondary/30 p-3">
            <p className="text-body-sm max-h-56 overflow-y-auto break-words whitespace-pre-wrap text-foreground">
              {content}
            </p>
          </div>
        )}

        {isCode && content && (
          <div className="mt-4 max-h-56 overflow-y-auto rounded-md border border-border bg-secondary/40 p-3 font-mono text-xs">
            {lines.map((line, idx) => (
              <div key={idx} className="min-h-4 whitespace-pre">
                {line.map((token, tokenIdx) =>
                  token.color ? (
                    <span key={tokenIdx} style={{ color: token.color }}>
                      {token.content}
                    </span>
                  ) : (
                    <span key={tokenIdx}>{token.content}</span>
                  ),
                )}
              </div>
            ))}
          </div>
        )}

        {isLink && url && (
          <div className="mt-4 overflow-hidden rounded-md border border-border">
            <LinkPreviewMedia
              itemId={item.id}
              domain={domain ?? ""}
              preview={item.preview}
            />
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex flex-col gap-2 border-t border-border pt-3">
        {isLink && url && (
          <>
            <Button
              size="sm"
              className="w-full justify-center gap-2"
              onClick={() => {
                const safeUrl = normalizeHttpUrl(url);
                if (safeUrl) {
                  window.open(safeUrl, "_blank", "noopener,noreferrer");
                  onClose();
                } else {
                  toastError(t.spotlight.quickLook.invalidUrl);
                }
              }}
            >
              <span>{t.spotlight.quickLook.openPage}</span>
              <ExternalLinkIcon className="size-3.5" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="w-full justify-center gap-2"
              onClick={() =>
                handleCopy(url, t.spotlight.quickLook.linkCopiedMessage)
              }
            >
              {copied ? (
                <CheckIcon className="size-3.5 text-primary" />
              ) : (
                <CopyIcon className="size-3.5" />
              )}
              <span>
                {copied
                  ? t.spotlight.quickLook.linkCopiedShort
                  : t.spotlight.quickLook.copyLinkShort}
              </span>
            </Button>
          </>
        )}

        {(isPrompt || isCode) && (
          <Button
            size="sm"
            className="w-full justify-center gap-2"
            onClick={() =>
              handleCopyContent(
                item.id,
                content,
                isPrompt
                  ? t.spotlight.quickLook.promptCopiedMessage
                  : t.spotlight.quickLook.codeCopiedMessage,
              )
            }
          >
            {copied ? (
              <CheckIcon className="size-3.5 text-primary" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
            <span>
              {copied
                ? t.spotlight.quickLook.copiedShort
                : isPrompt
                  ? t.spotlight.quickLook.copyPrompt
                  : t.spotlight.quickLook.copyCode}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
