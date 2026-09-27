"use client";

import { useActionState, useEffect, useState } from "react";

import { deleteTags, moveTags } from "@/lib/actions/tags";
import {
  findMoveNameCollisions,
  getInvalidMoveTargets,
  getNamePath,
  normalizeMoveSelection,
  type FlatTag,
} from "@/lib/tags/tree";
import { TAG_BULK_MAX } from "@/lib/validation/tag";
import { useDictionary } from "@/lib/i18n/client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toastSuccess } from "@/components/states/Toast";
import { TagParentPicker } from "./TagParentPicker";

/** Select value for "move to root"; `parentId=""` is root for the action's Zod too. */
const ROOT = "";

/**
 * Selection-mode panel on /tags: how many tags are checked and the two bulk
 * operations. Each runs as one transaction server-side (`move_tags`,
 * `delete_tags_reparent_children`, 0032); the checks here only shape the UI.
 * Dialogs mount only while open so every opening starts from a clean
 * action state.
 */
export function TagBulkPanel({
  selectedIds,
  flatTags,
  itemCounts,
  onDone,
  onCancel,
}: {
  selectedIds: string[];
  flatTags: FlatTag[];
  itemCounts: Record<string, number>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useDictionary();
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const count = selectedIds.length;
  // Each action is capped on what it sends: delete sends every checked id,
  // move only the ones whose ancestor isn't checked too.
  const deleteOverCap = count > TAG_BULK_MAX;
  const moveOverCap =
    normalizeMoveSelection(selectedIds, flatTags).length > TAG_BULK_MAX;

  return (
    <section aria-labelledby="tag-bulk-heading" className="flex flex-col gap-3">
      <h2 id="tag-bulk-heading" className="sr-only">
        {t.tags.bulk.panelLabel}
      </h2>
      <p aria-live="polite" className="text-label-md">
        {count === 0
          ? t.tags.bulk.noneSelected
          : t.tags.bulk.selectedCount(count)}
      </p>
      {deleteOverCap && (
        <p role="alert" className="text-sm text-destructive">
          {/* Move can still fit (checked descendants ride along): then
              only delete is over the cap, and the warning says so. */}
          {moveOverCap ? t.errors.tagBatchInvalid : t.tags.bulk.deleteOverCap}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={count === 0 || moveOverCap}
          onClick={() => setMoveOpen(true)}
        >
          {t.tags.bulk.move}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={count === 0 || deleteOverCap}
          onClick={() => setDeleteOpen(true)}
        >
          {t.tags.bulk.delete}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t.tags.page.cancelSelection}
        </Button>
      </div>

      {moveOpen && (
        <MoveTagsDialog
          selectedIds={selectedIds}
          flatTags={flatTags}
          onOpenChange={setMoveOpen}
          onMoved={onDone}
        />
      )}
      {deleteOpen && (
        <DeleteTagsAlertDialog
          selectedIds={selectedIds}
          flatTags={flatTags}
          itemCounts={itemCounts}
          onOpenChange={setDeleteOpen}
          onDeleted={onDone}
        />
      )}
    </section>
  );
}

function MoveTagsDialog({
  selectedIds,
  flatTags,
  onOpenChange,
  onMoved,
}: {
  selectedIds: string[];
  flatTags: FlatTag[];
  onOpenChange: (open: boolean) => void;
  onMoved: () => void;
}) {
  const t = useDictionary();
  const [state, formAction, pending] = useActionState(moveTags, null);
  const [destination, setDestination] = useState<string | null>(null);
  // Frozen at open time (this dialog mounts fresh per opening): a successful
  // move's own revalidatePath refreshes the parent's `flatTags`/`checked`
  // while this dialog is still closing, so a live `selectedIds` prop could
  // already read differently by the time render/the success effect run.
  const [ids] = useState(selectedIds);

  const byId = new Map(flatTags.map((tag) => [tag.id, tag]));
  const moving = normalizeMoveSelection(ids, flatTags);
  const movingTags = moving.flatMap((id) => {
    const tag = byId.get(id);
    return tag ? [tag] : [];
  });
  const invalid = getInvalidMoveTargets(ids, flatTags);
  const collisions =
    destination === null
      ? []
      : findMoveNameCollisions(
          ids,
          destination === ROOT ? null : destination,
          flatTags,
        );
  const carried = ids.length - moving.length;

  useEffect(() => {
    if (!state?.ok) return;
    toastSuccess(t.tags.bulk.moved(ids.length));
    onOpenChange(false);
    onMoved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && pending) return;
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form action={formAction} className="flex flex-col gap-4">
          {moving.map((id) => (
            <input key={id} type="hidden" name="ids" value={id} />
          ))}
          <input type="hidden" name="parentId" value={destination ?? ROOT} />

          <DialogHeader>
            <DialogTitle>{t.tags.bulk.moveTitle(ids.length)}</DialogTitle>
            <DialogDescription>{t.tags.bulk.moveDescription}</DialogDescription>
          </DialogHeader>

          <ul className="text-body-sm flex max-h-40 flex-col gap-1.5 overflow-y-auto overscroll-contain">
            {movingTags.map((tag) => (
              <li
                key={tag.id}
                dir="auto"
                className="flex flex-col [overflow-wrap:anywhere]"
              >
                <span>{tag.name}</span>
                {tag.parentId && (
                  <span className="text-body-sm text-muted-foreground">
                    {getNamePath(tag, byId).slice(0, -1).join(" / ")}
                  </span>
                )}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-1.5">
            <span id="bulk-destination-label" className="text-label-md">
              {t.tags.bulk.destinationLabel}
            </span>
            <TagParentPicker
              aria-labelledby="bulk-destination-label"
              flatTags={flatTags}
              excludedIds={invalid}
              value={destination}
              onValueChange={(value) => setDestination(value)}
              placeholder={t.tags.bulk.chooseDestination}
            />
          </div>

          {carried > 0 && (
            <p className="text-body-sm text-muted-foreground">
              {t.tags.bulk.includedByParent(carried)}
            </p>
          )}
          {collisions.length > 0 && (
            <p
              role="alert"
              dir="auto"
              className="text-sm [overflow-wrap:anywhere] text-destructive"
            >
              {t.tags.bulk.nameCollision(
                collisions.map((tag) => `“${tag.name}”`).join(", "),
              )}
            </p>
          )}
          {state?.ok === false && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={destination === null || collisions.length > 0}
              pending={pending}
              pendingLabel={t.tags.bulk.moving}
            >
              {t.tags.bulk.moveConfirm}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteTagsAlertDialog({
  selectedIds,
  flatTags,
  itemCounts,
  onOpenChange,
  onDeleted,
}: {
  selectedIds: string[];
  flatTags: FlatTag[];
  itemCounts: Record<string, number>;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const t = useDictionary();
  const [state, formAction, pending] = useActionState(deleteTags, null);
  // Frozen at open time (this dialog mounts fresh per opening): a successful
  // delete's own revalidatePath refreshes the parent's `flatTags`/`checked`
  // while this dialog is still closing, so a live `selectedIds` prop could
  // already read empty by the time the success effect runs -- and every tag
  // named here must stay named even if the tree filter hid it beforehand.
  const [ids] = useState(selectedIds);
  const byId = new Map(flatTags.map((tag) => [tag.id, tag]));
  const selected = ids.flatMap((id) => {
    const tag = byId.get(id);
    return tag ? [tag] : [];
  });

  useEffect(() => {
    if (!state?.ok) return;
    toastSuccess(t.tags.bulk.deleted(ids.length));
    onOpenChange(false);
    onDeleted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && pending) return;
        onOpenChange(open);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t.tags.bulk.deleteTitle(ids.length)}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t.tags.bulk.deleteDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="text-body-sm flex max-h-64 flex-col gap-1.5 overflow-y-auto overscroll-contain">
          {selected.map((tag) => (
            <li
              key={tag.id}
              dir="auto"
              className="flex items-baseline justify-between gap-3 [overflow-wrap:anywhere]"
            >
              <span className="flex min-w-0 flex-col">
                <span>{tag.name}</span>
                {tag.parentId && (
                  <span className="text-body-sm text-muted-foreground">
                    {getNamePath(tag, byId).slice(0, -1).join(" / ")}
                  </span>
                )}
              </span>
              <span className="text-metadata shrink-0 font-mono text-muted-foreground tabular-nums">
                {t.tags.bulk.itemCount(itemCounts[tag.id] ?? 0)}
              </span>
            </li>
          ))}
        </ul>
        {state?.ok === false && (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {t.common.cancel}
          </AlertDialogCancel>
          <form action={formAction}>
            {ids.map((id) => (
              <input key={id} type="hidden" name="ids" value={id} />
            ))}
            <AlertDialogAction
              type="submit"
              variant="destructive"
              pending={pending}
              pendingLabel={t.tags.bulk.deleting}
            >
              {t.tags.bulk.deleteConfirm}
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
