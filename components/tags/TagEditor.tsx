"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { CheckIcon } from "lucide-react";

import { createTag, updateTag } from "@/lib/actions/tags";
import {
  buildTagTree,
  flattenTreeWithDepth,
  getDescendantIds,
  type FlatTag,
} from "@/lib/tags/tree";
import { TAG_COLOR_LABELS, TAG_SWATCH_CLASS } from "@/lib/tags/colors";
import { TAG_COLOR_TOKENS, type TagColorToken } from "@/lib/validation/tag";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type TagEditorTarget =
  { mode: "create"; parentId: string | null } | { mode: "edit"; tag: FlatTag };

/**
 * Name, parent, color, description in one dialog.
 * The parent picker disables the tag itself and its whole subtree so a
 * cycle can never be selected in the UI (the hierarchy trigger,
 * 0008_tag_hierarchy.sql, is still the actual enforcement).
 *
 * Controlled from the caller (open/onOpenChange/target) rather than owning
 * a DialogTrigger itself: its trigger is a row action inside a
 * DropdownMenu, and a menu item can't also be a Dialog trigger -- the menu
 * unmounts the item as soon as a selection is made, before the dialog would
 * get a chance to open.
 */
export function TagEditor({
  open,
  onOpenChange,
  target,
  flatTags,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: TagEditorTarget | null;
  flatTags: FlatTag[];
  onSaved?: () => void;
}) {
  const [createState, createFormAction, createPending] = useActionState(
    createTag,
    null,
  );
  const [updateState, updateFormAction, updatePending] = useActionState(
    updateTag,
    null,
  );

  const mode = target?.mode ?? "create";
  const state = mode === "edit" ? updateState : createState;
  const formAction = mode === "edit" ? updateFormAction : createFormAction;
  const pending = mode === "edit" ? updatePending : createPending;

  useEffect(() => {
    if (state?.ok) {
      toast.success(mode === "edit" ? "Tag atualizada." : "Tag criada.");
      onOpenChange(false);
      onSaved?.();
    }
    // Only fire when the action result identity changes -- `mode` is a
    // snapshot of what just succeeded, not a dependency to re-run on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!target) {
    return null;
  }

  const editingTag = target.mode === "edit" ? target.tag : null;

  // `colorToken` arrives from the database typed as plain `string`, and with
  // radios an unmatched value means nothing is checked -- the form would then
  // submit no `colorToken` at all and fail validation. Resolving it against
  // the palette makes "always exactly one checked" structural.
  const selectedColorToken: TagColorToken =
    TAG_COLOR_TOKENS.find((token) => token === editingTag?.colorToken) ??
    "lime";

  const disabledParentIds = editingTag
    ? new Set([editingTag.id, ...getDescendantIds(editingTag.id, flatTags)])
    : new Set<string>();

  const parentOptions = flattenTreeWithDepth(buildTagTree(flatTags)).filter(
    (tag) => !disabledParentIds.has(tag.id),
  );

  const defaultParentId =
    target.mode === "edit" ? target.tag.parentId : target.parentId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form action={formAction} className="flex flex-col gap-4">
          {editingTag && (
            <input type="hidden" name="id" value={editingTag.id} />
          )}
          <DialogHeader>
            <DialogTitle>
              {mode === "edit" ? "Editar tag" : "Nova tag"}
            </DialogTitle>
            <DialogDescription>
              {mode === "edit"
                ? "As associações existentes com itens são preservadas."
                : "Tags ajudam a organizar e reencontrar itens da biblioteca."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="tag-name" className="text-label-md">
              Nome
            </label>
            <Input
              id="tag-name"
              name="name"
              dir="auto"
              required
              maxLength={80}
              defaultValue={editingTag?.name}
              aria-describedby={
                state?.ok === false && state.fieldErrors?.name
                  ? "tag-name-error"
                  : undefined
              }
              aria-invalid={
                (state?.ok === false && !!state.fieldErrors?.name) || undefined
              }
            />
            {state?.ok === false && state.fieldErrors?.name && (
              <p
                id="tag-name-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {state.fieldErrors.name[0]}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="tag-description" className="text-label-md">
              Descrição{" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </label>
            <Textarea
              id="tag-description"
              name="description"
              dir="auto"
              maxLength={500}
              rows={3}
              defaultValue={editingTag?.description ?? ""}
            />
          </div>

          {/*
            Native radios rather than a custom control: arrow-key navigation,
            roving tabindex, the checked state and the FormData entry all come
            for free, so the Server Action still just reads `colorToken`.
            The name is hidden visually, never from assistive tech -- `title`
            serves the pointer, the `sr-only` span serves the accessible name.
          */}
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-label-md mb-1.5">Cor</legend>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
              {TAG_COLOR_TOKENS.map((token) => (
                <label
                  key={token}
                  title={TAG_COLOR_LABELS[token]}
                  className="relative flex cursor-pointer items-center justify-center"
                >
                  <input
                    type="radio"
                    name="colorToken"
                    value={token}
                    defaultChecked={token === selectedColorToken}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-7 rounded-full ring-offset-background transition-[box-shadow] duration-(--motion-fast) ease-out-muvuca motion-reduce:transition-none",
                      "peer-checked:ring-2 peer-checked:ring-foreground peer-checked:ring-offset-2",
                      "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
                      TAG_SWATCH_CLASS[token],
                    )}
                  />
                  <CheckIcon
                    aria-hidden="true"
                    strokeWidth={3}
                    className="pointer-events-none absolute size-4 text-white opacity-0 drop-shadow-[0_1px_1px_rgb(0_0_0/0.55)] peer-checked:opacity-100"
                  />
                  <span className="sr-only">{TAG_COLOR_LABELS[token]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <span className="text-label-md" id="tag-parent-label">
              Tag pai
            </span>
            <Select name="parentId" defaultValue={defaultParentId ?? ""}>
              <SelectTrigger
                aria-labelledby="tag-parent-label"
                className="w-full"
              >
                <SelectValue placeholder="Nenhuma (tag raiz)">
                  {(value: string) =>
                    value === ""
                      ? "Nenhuma (tag raiz)"
                      : (parentOptions.find((tag) => tag.id === value)?.name ??
                        value)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhuma (tag raiz)</SelectItem>
                {parentOptions.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {"　".repeat(tag.depth)}
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {state?.ok === false && !state.fieldErrors && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" pending={pending}>
              {mode === "edit" ? "Salvar alterações" : "Criar tag"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
