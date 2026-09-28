"use client";

import { useState, type ReactNode } from "react";
import { CopyIcon, LinkIcon, MaximizeIcon } from "lucide-react";
import type { LibraryItemSummary } from "@/lib/database/queries/items";
import { copyToClipboard } from "@/lib/clipboard";
import { normalizeHttpUrl } from "@/lib/validation/item";
import { useDictionary } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { announce } from "@/components/states/Announcer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toastError } from "@/components/states/Toast";
import { CodeSnippetPreview } from "./CodeSnippetPreview";
import { PromptMarkdownPreview } from "./PromptMarkdownPreview";
import { useTransientFlag } from "./useTransientFlag";
import { CopyStateIcon } from "./CopyStateIcon";
import {
  ACTION_CLASS,
  CopyLinkAction,
  ItemCardActions,
  ItemCardFrame,
  ItemCardHeading,
  ItemCardPlainLayout,
  ItemTags,
  ItemTypeBadge,
  type ItemCardBaseProps,
} from "./ItemCardChrome";

/**
 * Figma 251:1944/251:1990 hover: the preview's base goes `surface` ->
 * `surface-subtle` under the same `shadow-1` layer (PREVIEW_PANEL).
 */
const PREVIEW_HOVER = "group-hover:bg-secondary";

type StoredContentCardProps<T extends "prompt" | "code_component"> =
  ItemCardBaseProps & {
    item: Extract<LibraryItemSummary, { type: T }>;
    onView: () => void;
    onCopyContent: () => Promise<string>;
  };

// Prompt/code preview is a filled panel now, not a rule-separated
// paragraph: at the same size and color as the description it used to
// read as one continuous block, and the panel says "this is the stored
// content" without spending a second type size on it. Both types pass
// their own component sharing that chrome as `preview`: CodeSnippetPreview
// (the snippet's first 6 lines, with a fade when there's more) and
// PromptMarkdownPreview (the prompt as prose, tokenized as markdown).
//
// Both panels have the same fixed height (PREVIEW_PANEL, as in Figma),
// so a prompt card and a code card line up regardless of content length.
// No `flex-1`: stretching into the grid row's leftover would break that
// parity. The leftover falls through to ItemTags' `mt-auto`, which
// anchors tags to the card's bottom edge; with no tags it just sits at
// the card's own bottom, same as the link layout.
function StoredContentCard({
  item,
  itemTags,
  morphing,
  isPending,
  onEdit,
  onDelete,
  onView,
  onCopyContent,
  labels,
  preview,
  extraAction,
}: StoredContentCardProps<"prompt" | "code_component"> & {
  labels: {
    view: string;
    copy: string;
    copying: string;
    copiedNotice: string;
    copyFailed: string;
  };
  preview: ReactNode;
  extraAction?: ReactNode;
}) {
  const t = useDictionary();
  const [copied, triggerCopied] = useTransientFlag(1500);
  const [copying, setCopying] = useState(false);

  /**
   * One handler for both bodies: prompt and code_component differ only in
   * the words of the feedback, and the truncated-preview bug was in both.
   * The pending read goes into the clipboard call unawaited on purpose --
   * see `copyToClipboard`.
   */
  async function handleCopyContent() {
    setCopying(true);
    const success = await copyToClipboard(onCopyContent());
    setCopying(false);
    if (success) {
      triggerCopied();
      announce(labels.copiedNotice);
    } else {
      toastError(labels.copyFailed);
    }
  }

  const badge = <ItemTypeBadge type={item.type} isPending={isPending} />;

  const actions = (
    <ItemCardActions title={item.title} onEdit={onEdit} onDelete={onDelete}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={labels.view}
              onClick={onView}
              className={ACTION_CLASS}
            />
          }
        >
          <MaximizeIcon aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>{labels.view}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={labels.copy}
              pending={copying}
              pendingLabel={labels.copying}
              onClick={handleCopyContent}
              className={ACTION_CLASS}
            />
          }
        >
          <CopyStateIcon copied={copied} Icon={CopyIcon} />
        </TooltipTrigger>
        <TooltipContent>
          {copied ? t.items.card.copied : labels.copy}
        </TooltipContent>
      </Tooltip>
      {extraAction}
    </ItemCardActions>
  );

  return (
    <ItemCardFrame morphing={morphing} isPending={isPending}>
      <ItemCardPlainLayout badge={badge} actions={actions}>
        {/* The preview panel used to sit outside this button, so the
          biggest region of the card (168px measured) had no click
          target at all -- elementFromPoint() on it hit the bare <p>,
          no <a>/<button> ancestor. Folding `preview` into the same
          button as the heading fixes that without adding a tab stop: it
          is still the one control the title/MaximizeIcon already
          pointed at (`onView`), just grown to cover the content that
          sits above it. `gap-6` (24px), not the surrounding `gap-4`,
          reproduces the exact description-to-panel gap the first pass
          set up (16px bottom padding + 8px top padding on the two
          containers that used to split here). `ring-inset` instead of
          the small button's `ring-offset-2`: at this footprint an
          offset ring would sit flush against the card's own edges,
          reading as a second border rather than focus -- the media
          card's full-body anchor already uses inset for the same
          reason. */}
        <button
          type="button"
          onClick={onView}
          className="flex flex-col gap-6 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <ItemCardHeading
            title={item.title}
            description={item.description}
            morphing={morphing}
            descriptionClamp="line-clamp-1"
          />
          {preview}
        </button>
        <ItemTags tags={itemTags} />
      </ItemCardPlainLayout>
    </ItemCardFrame>
  );
}

export function ItemCardPrompt(props: StoredContentCardProps<"prompt">) {
  const t = useDictionary();

  return (
    <StoredContentCard
      {...props}
      labels={{
        view: t.items.card.viewFullContent,
        copy: t.items.card.copyPrompt,
        copying: t.items.card.copyingPrompt,
        copiedNotice: t.items.card.promptCopied,
        copyFailed: t.items.card.promptCopyFailed,
      }}
      preview={
        <PromptMarkdownPreview
          contentPreview={props.item.contentPreview}
          className={PREVIEW_HOVER}
        />
      }
    />
  );
}

export function ItemCardCode(props: StoredContentCardProps<"code_component">) {
  const t = useDictionary();
  const safeHref = props.item.url ? normalizeHttpUrl(props.item.url) : null;

  return (
    <StoredContentCard
      {...props}
      labels={{
        view: t.items.card.viewFullCode,
        copy: t.items.card.copyCode,
        copying: t.items.card.copyingCode,
        copiedNotice: t.items.card.codeCopied,
        copyFailed: t.items.card.codeCopyFailed,
      }}
      preview={
        <CodeSnippetPreview
          contentPreview={props.item.contentPreview}
          language={props.item.language}
          className={PREVIEW_HOVER}
        />
      }
      extraAction={
        safeHref ? <CopyLinkAction href={safeHref} Icon={LinkIcon} /> : null
      }
    />
  );
}
