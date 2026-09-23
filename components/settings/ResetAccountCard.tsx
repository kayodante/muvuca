"use client";

import { useId, useState, useTransition } from "react";

import { resetAccount } from "@/lib/actions/account";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toastSuccess } from "@/components/states/Toast";

export function ResetAccountCard() {
  const t = useDictionary();
  const CONFIRM_PHRASE = t.settings.danger.resetAccount.confirmPhrase;
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputId = useId();

  function close(nextOpen: boolean) {
    if (isPending) return;
    if (!nextOpen) {
      setConfirmText("");
      setError(null);
    }
    setOpen(nextOpen);
  }

  function confirm() {
    if (confirmText !== CONFIRM_PHRASE || isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await resetAccount();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toastSuccess(t.settings.danger.resetAccount.success);
      close(false);
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-destructive/40 bg-card p-4 sm:p-5">
      <div className="space-y-1">
        <p className="text-label-md">
          {t.settings.danger.resetAccount.cardHeading}
        </p>
        <p className="text-body-sm text-muted-foreground">
          {t.settings.danger.resetAccount.cardDescription}
        </p>
      </div>

      <AlertDialog open={open} onOpenChange={close}>
        <AlertDialogTrigger
          render={
            <Button variant="destructive" size="sm" className="self-start" />
          }
        >
          {t.settings.danger.resetAccount.cardHeading}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.settings.danger.resetAccount.confirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.settings.danger.resetAccount.confirmDescriptionPrefix}{" "}
              <strong>{CONFIRM_PHRASE}</strong>{" "}
              {t.settings.danger.resetAccount.confirmDescriptionSuffix}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-1.5">
            <label htmlFor={inputId} className="sr-only">
              {t.settings.danger.resetAccount.confirmInputLabel(CONFIRM_PHRASE)}
            </label>
            <Input
              id={inputId}
              autoComplete="off"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              disabled={isPending}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              pending={isPending}
              pendingLabel={t.settings.danger.resetAccount.deleting}
              disabled={confirmText !== CONFIRM_PHRASE}
              onClick={confirm}
            >
              {t.settings.danger.resetAccount.confirmButton}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
