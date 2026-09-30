"use client";

import { useActionState, useState } from "react";
import { LogOutIcon } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { useDictionary } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
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

export function SignOutButton({ className }: { className?: string } = {}) {
  const t = useDictionary();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(signOut, null);

  return (
    <>
      {/* Icon-only below `sm` keeps the crowded mobile topbar / compact
          contexts from squeezing space, while preserving accessible name. */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className={className}
      >
        <LogOutIcon aria-hidden="true" className="sm:hidden" />
        <span className="sr-only sm:not-sr-only">{t.auth.signOut.label}</span>
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.auth.signOut.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.auth.signOut.confirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {state?.ok === false && (
            <p role="alert" className="text-xs text-destructive">
              {state.message}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {t.common.cancel}
            </AlertDialogCancel>
            <form action={formAction}>
              <AlertDialogAction
                type="submit"
                variant="destructive"
                pending={pending}
                pendingLabel={t.auth.signOut.pending}
              >
                {t.auth.signOut.label}
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
