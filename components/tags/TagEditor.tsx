"use client";

import type { FlatTag } from "@/lib/tags/tree";
import { useDictionary } from "@/lib/i18n/client";
import { TagForm, type TagFormTarget } from "./TagForm";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type TagEditorTarget = TagFormTarget;

/** Dialog shell around `TagForm`, kept only until the /tags inspector replaces it. */
export function TagEditor({
  open,
  onOpenChange,
  target,
  flatTags,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: TagEditorTarget | null;
  flatTags: FlatTag[];
}) {
  const t = useDictionary();

  if (!target) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {target.mode === "edit"
              ? t.tags.editor.editTitle
              : t.tags.editor.createTitle}
          </DialogTitle>
          <DialogDescription>
            {target.mode === "edit"
              ? t.tags.editor.editDescription
              : t.tags.editor.createDescription}
          </DialogDescription>
        </DialogHeader>
        <TagForm
          key={
            target.mode === "edit"
              ? target.tag.id
              : `create:${target.parentId ?? ""}`
          }
          target={target}
          flatTags={flatTags}
          onSaved={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
