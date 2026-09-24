"use client";

import { useActionState, useEffect } from "react";

import { deleteTag } from "@/lib/actions/tags";
import { useDictionary } from "@/lib/i18n/client";

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

/**
 * Destructive confirmation, focus kept away from the destructive action
 * until the user has read the context. Explains the two real consequences
 * of deleting a tag up front -- children are promoted to this tag's own
 * parent, items keep existing but lose only this one association -- so
 * "excluir" never reads as "excluir os itens".
 * Controlled: its trigger lives inside the inspector's DropdownMenu.
 */
export function DeleteTagAlertDialog({
  open,
  onOpenChange,
  tag,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tag: { id: string; name: string } | null;
  onDeleted?: () => void;
}) {
  const t = useDictionary();
  const [state, formAction, pending] = useActionState(deleteTag, null);

  useEffect(() => {
    if (state?.ok) {
      toastSuccess(t.tags.deleteDialog.deleted);
      onOpenChange(false);
      onDeleted?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!tag) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle
            dir="auto"
            className="[overflow-wrap:anywhere] break-words"
          >
            {t.tags.deleteDialog.title(tag.name)}
          </AlertDialogTitle>
          <AlertDialogDescription
            dir="auto"
            className="[overflow-wrap:anywhere] break-words"
          >
            {t.tags.deleteDialog.description(tag.name)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state?.ok === false && (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
          <form action={formAction}>
            <input type="hidden" name="id" value={tag.id} />
            <AlertDialogAction
              type="submit"
              variant="destructive"
              pending={pending}
              pendingLabel={t.tags.deleteDialog.deleting}
            >
              {t.tags.deleteDialog.confirm}
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
