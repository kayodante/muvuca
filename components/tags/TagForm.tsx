"use client";

import { useActionState, useEffect } from "react";
import { CheckIcon } from "lucide-react";

import { createTag, updateTag } from "@/lib/actions/tags";
import {
  buildTagTree,
  flattenTreeWithDepth,
  getDescendantIds,
  type FlatTag,
} from "@/lib/tags/tree";
import { TAG_SWATCH_CLASS } from "@/lib/tags/colors";
import { TAG_COLOR_TOKENS, type TagColorToken } from "@/lib/validation/tag";
import { useDictionary } from "@/lib/i18n/client";
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
import { toastSuccess } from "@/components/states/Toast";

export type TagFormTarget =
  { mode: "create"; parentId: string | null } | { mode: "edit"; tag: FlatTag };

/**
 * Name, description, color and parent for one tag -- the editor inside the
 * /tags inspector. The parent picker disables the tag itself and its whole
 * subtree so a cycle can never be picked (the hierarchy trigger,
 * 0008_tag_hierarchy.sql, is still the enforcement).
 *
 * Fields are uncontrolled and read their defaults once: callers remount it
 * with a `key` per target.
 */
export function TagForm({
  target,
  flatTags,
  onSaved,
  onDirtyChange,
}: {
  target: TagFormTarget;
  flatTags: FlatTag[];
  /** Called after a successful save with the saved tag's id. */
  onSaved: (id: string) => void;
  /** `true` on the first edit, `false` once saved. */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const t = useDictionary();
  const [createState, createFormAction, createPending] = useActionState(
    createTag,
    null,
  );
  const [updateState, updateFormAction, updatePending] = useActionState(
    updateTag,
    null,
  );

  const mode = target.mode;
  const editingTag = target.mode === "edit" ? target.tag : null;
  const state = mode === "edit" ? updateState : createState;
  const formAction = mode === "edit" ? updateFormAction : createFormAction;
  const pending = mode === "edit" ? updatePending : createPending;

  useEffect(() => {
    if (!state?.ok) return;
    toastSuccess(
      mode === "edit" ? t.tags.editor.updated : t.tags.editor.created,
    );
    onDirtyChange?.(false);
    const savedId =
      mode === "create" && createState?.ok
        ? createState.data.id
        : editingTag?.id;
    if (savedId) onSaved(savedId);
    // Only fire when the action result identity changes -- `mode` is a
    // snapshot of what just succeeded, not a dependency to re-run on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const markDirty = () => onDirtyChange?.(true);

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
    <form
      action={formAction}
      onChange={markDirty}
      className="flex flex-col gap-4"
    >
      {editingTag && <input type="hidden" name="id" value={editingTag.id} />}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tag-name" className="text-label-md">
          {t.tags.editor.nameLabel}
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
          {t.tags.editor.descriptionLabel}{" "}
          <span className="font-normal text-muted-foreground">
            {t.tags.editor.optional}
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
        <legend className="text-label-md mb-1.5">
          {t.tags.editor.colorLabel}
        </legend>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
          {TAG_COLOR_TOKENS.map((token) => (
            <label
              key={token}
              title={t.tags.colors[token]}
              className="group relative flex cursor-pointer items-center justify-center p-0.5"
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
                  "size-7 rounded-full ring-offset-background transition-[box-shadow,scale] duration-(--motion-fast) ease-out-muvuca group-hover:scale-110 peer-checked:scale-105 active:scale-[0.97] motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:peer-checked:scale-100 motion-reduce:active:scale-100",
                  "peer-checked:ring-2 peer-checked:ring-foreground peer-checked:ring-offset-2",
                  "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
                  TAG_SWATCH_CLASS[token],
                )}
              />
              <CheckIcon
                aria-hidden="true"
                strokeWidth={3}
                className="pointer-events-none absolute size-4 scale-[0.8] text-white opacity-0 drop-shadow-[0_1px_1px_rgb(0_0_0/0.55)] transition-[opacity,scale] duration-(--motion-fast) ease-out-muvuca peer-checked:scale-100 peer-checked:opacity-100 motion-reduce:transition-none"
              />
              <span className="sr-only">{t.tags.colors[token]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <span className="text-label-md" id="tag-parent-label">
          {t.tags.editor.parentLabel}
        </span>
        <Select
          name="parentId"
          defaultValue={defaultParentId ?? ""}
          onValueChange={markDirty}
        >
          <SelectTrigger aria-labelledby="tag-parent-label" className="w-full">
            <SelectValue placeholder={t.tags.editor.noParent}>
              {(value: string) =>
                value === ""
                  ? t.tags.editor.noParent
                  : (parentOptions.find((tag) => tag.id === value)?.name ??
                    value)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t.tags.editor.noParent}</SelectItem>
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

      <div className="flex justify-end">
        <Button
          type="submit"
          pending={pending}
          pendingLabel={t.tags.editor.saving}
        >
          {mode === "edit"
            ? t.tags.editor.saveButton
            : t.tags.editor.createButton}
        </Button>
      </div>
    </form>
  );
}
