"use client";

import { ExternalLinkIcon } from "lucide-react";
import type { LibraryItem } from "@/lib/database/queries/items";
import type { Tag } from "@/lib/database/queries/tags";
import { normalizeHttpUrl } from "@/lib/validation/item";
import { MORPH_CLASS, MORPH_TITLE_CLASS } from "@/lib/motion/view-transition";
import { useDictionary } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { getTagHref } from "@/lib/tags/routes";
import { TagChip } from "@/components/tags/TagChip";
import { PromptContentPanel } from "@/components/items/PromptContentPanel";
import { PromptCopyButton } from "@/components/items/PromptCopyButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PromptDetailDialog({
  item,
  tags,
  onOpenChange,
  onEdit,
}: {
  item: Extract<LibraryItem, { type: "prompt" | "code_component" }> | null;
  tags: Tag[];
  onOpenChange: (open: boolean) => void;
  onEdit: (
    item: Extract<LibraryItem, { type: "prompt" | "code_component" }>,
  ) => void;
}) {
  const t = useDictionary();
  if (!item) return null;
  const associatedTags = item.tagIds.flatMap((tagId) => {
    const tag = tags.find((candidate) => candidate.id === tagId);
    return tag ? [tag] : [];
  });
  const safeHref =
    item.type === "code_component" && item.url
      ? normalizeHttpUrl(item.url)
      : null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl",
          MORPH_CLASS,
        )}
      >
        <DialogHeader>
          <DialogTitle
            dir="auto"
            className={cn(
              "text-headline-sm [overflow-wrap:anywhere]",
              MORPH_TITLE_CLASS,
            )}
          >
            {item.title}
          </DialogTitle>
          {item.description && (
            <DialogDescription dir="auto" className="[overflow-wrap:anywhere]">
              {item.description}
            </DialogDescription>
          )}
        </DialogHeader>
        {associatedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {associatedTags.map((tag) => (
              <TagChip
                key={tag.id}
                name={tag.name}
                colorToken={tag.colorToken}
                href={getTagHref(tag)}
              />
            ))}
          </div>
        )}
        {safeHref && (
          <div className="text-body-sm flex items-center gap-1.5 text-muted-foreground">
            <a
              href={safeHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-sm text-foreground underline-offset-4 outline-none hover:text-brand-accent hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
              {t.items.promptDetail.openSource}
            </a>
          </div>
        )}
        <PromptContentPanel
          content={item.content}
          variant={item.type}
          language={item.type === "code_component" ? item.language : null}
          t={t}
        />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEdit(item)}
          >
            {item.type === "code_component"
              ? t.items.promptDetail.editComponent
              : t.items.promptDetail.editPrompt}
          </Button>
          {item.type === "code_component" ? (
            <PromptCopyButton
              content={item.content}
              label={t.items.promptDetail.copyCode}
              pendingLabel={t.items.promptDetail.copyingCode}
              successLabel={t.items.promptDetail.codeCopiedLabel}
              successMessage={t.items.promptDetail.codeCopiedMessage}
              errorMessage={t.items.promptDetail.codeCopyFailed}
            />
          ) : (
            <PromptCopyButton
              content={item.content}
              label={t.items.promptDetail.copyPrompt}
              pendingLabel={t.items.promptDetail.copyingPrompt}
              successLabel={t.items.promptDetail.promptCopiedLabel}
              successMessage={t.items.promptDetail.promptCopiedMessage}
              errorMessage={t.items.promptDetail.promptCopyFailed}
            />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
