"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { deleteTag } from "@/lib/actions/tags";

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

/**
 * Destructive confirmation, focus kept away from the destructive action
 * until the user has read the context. Explains the two real consequences
 * of deleting a tag up front -- children are promoted to this tag's own
 * parent, items keep existing but lose only this one association -- so
 * "excluir" never reads as "excluir os itens".
 * Controlled for the same reason as `TagEditor`: its trigger lives inside a
 * row's DropdownMenu.
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
  const [state, formAction, pending] = useActionState(deleteTag, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Tag excluída.");
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
            Excluir “{tag.name}”?
          </AlertDialogTitle>
          <AlertDialogDescription
            dir="auto"
            className="[overflow-wrap:anywhere] break-words"
          >
            As tags filhas diretas passam a ficar sob a tag pai de “{tag.name}”
            (ou viram tags raiz, se “{tag.name}” já era raiz). Os itens
            associados não são excluídos -- apenas perdem a associação com esta
            tag.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state?.ok === false && (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <form action={formAction}>
            <input type="hidden" name="id" value={tag.id} />
            <AlertDialogAction
              type="submit"
              variant="destructive"
              pending={pending}
            >
              Excluir tag
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
