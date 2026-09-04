"use client";

import { useActionState } from "react";
import { LogOutIcon } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [state, formAction, pending] = useActionState(signOut, null);

  return (
    <form action={formAction}>
      {/* `pending`, not `disabled` + a swapped label: the Button already
          handles busy state without changing its own width. Icon-only below
          `sm` keeps the crowded mobile topbar from squeezing search. */}
      <Button
        type="submit"
        variant="outline"
        size="sm"
        pending={pending}
        pendingLabel="Saindo da conta"
      >
        <LogOutIcon aria-hidden="true" className="sm:hidden" />
        <span className="sr-only sm:not-sr-only">Sair</span>
      </Button>
      {state?.ok === false && (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {state.message}
        </p>
      )}
    </form>
  );
}
