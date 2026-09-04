"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { resetAccount } from "@/lib/actions/account";
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

const CONFIRM_PHRASE = "APAGAR";

export function ResetAccountCard() {
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
      toast.success("Sua conta foi zerada.");
      close(false);
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-destructive/40 bg-card p-4 sm:p-5">
      <div className="space-y-1">
        <p className="text-label-md">Começar do zero</p>
        <p className="text-body-sm text-muted-foreground">
          Apaga permanentemente todos os seus links, prompts e tags. Sua conta
          fica como se tivesse acabado de ser criada.
        </p>
      </div>

      <AlertDialog open={open} onOpenChange={close}>
        <AlertDialogTrigger
          render={
            <Button variant="destructive" size="sm" className="self-start" />
          }
        >
          Começar do zero
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar todos os dados?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove todos os seus links, prompts, tags e
              preferências. Não pode ser desfeita. Digite{" "}
              <strong>{CONFIRM_PHRASE}</strong> para confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-1.5">
            <label htmlFor={inputId} className="sr-only">
              Digite {CONFIRM_PHRASE} para confirmar
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
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              pending={isPending}
              disabled={confirmText !== CONFIRM_PHRASE}
              onClick={confirm}
            >
              Apagar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
