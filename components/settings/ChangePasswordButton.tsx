"use client";

import { useActionState, useEffect } from "react";
import { requestPasswordChange } from "@/lib/actions/auth";
import { useDictionary } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { toastSuccess } from "@/components/states/Toast";

/** Emails a recovery link to the session's own address (AAA-242). */
export function ChangePasswordButton() {
  const t = useDictionary();
  const [state, formAction, pending] = useActionState(
    requestPasswordChange,
    null,
  );

  useEffect(() => {
    if (state?.ok) toastSuccess(t.settings.account.changePasswordSent);
  }, [state, t]);

  return (
    <form
      action={formAction}
      className="flex flex-col items-start gap-2 sm:items-end"
    >
      <Button
        type="submit"
        variant="outline"
        pending={pending}
        pendingLabel={t.settings.account.changePasswordPending}
      >
        {t.settings.account.changePassword}
      </Button>
      {state?.ok === false && (
        <p role="alert" className="text-xs text-destructive">
          {state.message}
        </p>
      )}
    </form>
  );
}
