"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import type { LibraryItemSummary } from "@/lib/database/queries/items";
import { deleteItem } from "@/lib/actions/items";
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

export function DeleteItemAlertDialog({
  item,
  onOpenChange,
}: {
  item: LibraryItemSummary | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, action, pending] = useActionState(deleteItem, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Item excluído.");
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
            Excluir “{item.title}”?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação remove o item e suas associações com tags. Não pode ser
            desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state?.ok === false && (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <form action={action}>
            <input type="hidden" name="id" value={item.id} />
            <AlertDialogAction
              type="submit"
              variant="destructive"
              pending={pending}
            >
              Excluir item
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
