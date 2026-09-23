"use client";

import { useActionState, useEffect } from "react";
import type { LibraryItemSummary } from "@/lib/database/queries/items";
import { deleteItem } from "@/lib/actions/items";
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

export function DeleteItemAlertDialog({
  item,
  onOpenChange,
}: {
  item: LibraryItemSummary | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useDictionary();
  const [state, action, pending] = useActionState(deleteItem, null);

  useEffect(() => {
    if (state?.ok) {
      toastSuccess(t.items.deleteDialog.deleted);
      onOpenChange(false);
    }
    // `onOpenChange` may be inline and change identity with parent renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!item) return null;
  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle
            dir="auto"
            className="[overflow-wrap:anywhere] break-words"
          >
            {t.items.deleteDialog.title(item.title)}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t.items.deleteDialog.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state?.ok === false && (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
          <form action={action}>
            <input type="hidden" name="id" value={item.id} />
            <AlertDialogAction
              type="submit"
              variant="destructive"
              pending={pending}
            >
              {t.items.deleteDialog.confirm}
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
