"use client";

import { useMemo, useState, type Ref } from "react";
import {
  ExternalLinkIcon,
  CopyIcon,
  ChevronLeftIcon,
  PanelRightCloseIcon,
} from "lucide-react";

import type { LibraryItemSummary } from "@/lib/database/queries/items";
import { getNamePath, type FlatTag } from "@/lib/tags/tree";
import type { Tag } from "@/lib/database/queries/tags";
import { copyToClipboard } from "@/lib/clipboard";
import { getItemDetails } from "@/lib/actions/items";
import { normalizeHttpUrl } from "@/lib/validation/item";
import { Button } from "@/components/ui/button";
import { useHighlightedLines } from "@/components/items/useHighlightedLines";
import { LinkPreviewMedia } from "@/components/items/LinkPreviewMedia";
import { typeMetaFor } from "@/components/items/typeMeta";
import { CopyStateIcon } from "@/components/items/CopyStateIcon";
import { TagChip } from "@/components/tags/TagChip";
import { useDictionary } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { toastError, toastSuccess } from "@/components/states/Toast";

export function QuickLookPreview({
  item,
  tags,
  onClose,
  closeButtonRef,
}: {
  item: LibraryItemSummary;
  tags: (FlatTag | Tag)[];
  onClose: () => void;
  // Exposed so the caller can move focus here when the preview replaces the
  // list below `sm` instead of stacking under it -- there's nothing else on
  // screen to receive focus.
  closeButtonRef?: Ref<HTMLButtonElement>;
}) {
  const t = useDictionary();
  const [copied, setCopied] = useState(false);
  const meta = typeMetaFor(t)[item.type];

  // Associated tags
  const associatedTags = tags.filter((tag) => item.tagIds?.includes(tag.id));
  // For each chip's `title`: the full ancestor path ("Pai › Filha"), not
  // just the leaf name -- the row above already shows the leaf.
  const tagsById = useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag])),
    [tags],
  );

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
      // No top border: below `sm` the preview replaces the list instead of
      // stacking under it, so there's no seam to draw one against.
      className="flex h-full w-full flex-col bg-card p-4 sm:w-80 sm:border-l sm:border-border sm:p-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-secondary">
            <meta.Icon
              aria-hidden="true"
              className={cn("size-3.5", meta.hue)}
            />
          </div>
          {/* Concat literal, não cn(): twMerge trataria os dois `text-*` como
              o mesmo grupo "cor de texto" e descartaria text-brand-pixel
              (fonte) em favor de meta.hue (cor). Mesma regra de ItemCard. */}
          <span className={`text-brand-pixel ${meta.hue}`}>{meta.label}</span>
          {language && (
            <span className="text-metadata text-muted-foreground">
              {language}
            </span>
          )}
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [@media(pointer:coarse)]:flex [@media(pointer:coarse)]:size-9 [@media(pointer:coarse)]:items-center [@media(pointer:coarse)]:justify-center"
          aria-label={t.spotlight.quickLook.close}
        >
          {/* Same control, same name: below `sm` it replaces the list (a
              "back" gesture), from `sm` it sits beside it (a "close panel"
              gesture) -- two icons for one action, not two actions. */}
          <ChevronLeftIcon className="size-4 sm:hidden" aria-hidden="true" />
          <PanelRightCloseIcon
            className="size-4 max-sm:hidden"
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Content scroll area */}
      <div className="min-h-0 flex-1 overflow-y-auto py-3">
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
              <TagChip
                key={tag.id}
                name={tag.name}
                colorToken={tag.colorToken}
                title={getNamePath(tag, tagsById).join(" › ")}
              />
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
              <CopyStateIcon
                copied={copied}
                Icon={CopyIcon}
                className="size-3.5"
              />
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
            <CopyStateIcon
              copied={copied}
              Icon={CopyIcon}
              className="size-3.5"
            />
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
