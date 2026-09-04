"use client";

import { ExternalLinkIcon } from "lucide-react";
import type { LibraryItem } from "@/lib/database/queries/items";
import type { Tag } from "@/lib/database/queries/tags";
import { normalizeHttpUrl } from "@/lib/validation/item";
import { MORPH_CLASS, MORPH_TITLE_CLASS } from "@/lib/motion/view-transition";
import { cn } from "@/lib/utils";
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
                href={`/tags/${tag.id}`}
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
              Abrir fonte original
            </a>
          </div>
        )}
        <PromptContentPanel content={item.content} variant={item.type} />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEdit(item)}
          >
            {item.type === "code_component"
              ? "Editar componente"
              : "Editar prompt"}
          </Button>
          {item.type === "code_component" ? (
            <PromptCopyButton
              content={item.content}
              label="Copiar código"
              successMessage="Código copiado para a área de transferência."
              errorMessage="Não foi possível copiar o código."
            />
          ) : (
            <PromptCopyButton content={item.content} />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
