"use client";

import { useActionState } from "react";
import { updatePassword } from "@/lib/actions/auth";
import { useDictionary } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/auth/AuthCard";

/**
 * "Nova senha" card. Only ever rendered for a recovery-flow session --
 * `app/(auth)/reset-password/page.tsx` (Server Component) already checked
 * `hasRecoverySession()` and redirected before this mounts, and
 * `updatePassword` checks it again server-side before touching the
 * password.
 */
export function ResetPasswordForm() {
  const t = useDictionary();
  const [state, formAction, pending] = useActionState(updatePassword, null);

  const passwordError =
    state?.ok === false ? state.fieldErrors?.password?.[0] : undefined;
  const confirmError =
    state?.ok === false ? state.fieldErrors?.confirmPassword?.[0] : undefined;
  // A Supabase-side failure (recovery session expired, same password, weak
  // password) has no fieldErrors -- it's the one case shown as a banner
  // rather than tied to a specific input.
  const genericError =
    state?.ok === false && !state.fieldErrors ? state.message : undefined;

  return (
    <AuthCard>
      <div className="flex flex-col gap-3">
        <p className="text-brand-pixel text-brand-accent">
          {t.auth.resetPassword.badge}
        </p>
        <h1 className="text-headline-lg">{t.auth.resetPassword.title}</h1>
      </div>
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-label-md">
            {t.auth.resetPassword.passwordLabel}
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={72}
            required
            aria-describedby={
              passwordError ? "password-hint password-error" : "password-hint"
            }
            aria-invalid={!!passwordError || undefined}
          />
          <p id="password-hint" className="text-body-sm text-muted-foreground">
            {t.auth.resetPassword.passwordHint}
          </p>
          {passwordError && (
            <p
              id="password-error"
              role="alert"
              aria-live="polite"
              className="text-body-sm [overflow-wrap:anywhere] text-destructive"
            >
              {passwordError}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirmPassword" className="text-label-md">
            {t.auth.resetPassword.confirmPasswordLabel}
          </label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={72}
            required
            aria-describedby={
              confirmError ? "confirm-password-error" : undefined
            }
            aria-invalid={!!confirmError || undefined}
          />
          {confirmError && (
            <p
              id="confirm-password-error"
              role="alert"
              aria-live="polite"
              className="text-body-sm [overflow-wrap:anywhere] text-destructive"
            >
              {confirmError}
            </p>
          )}
        </div>
        {genericError && (
          <p
            role="alert"
            aria-live="polite"
            className="text-body-sm [overflow-wrap:anywhere] text-destructive"
          >
            {genericError}
          </p>
        )}
        <Button
          type="submit"
          className="w-full"
          pending={pending}
          pendingLabel={t.auth.resetPassword.saving}
        >
          {t.auth.resetPassword.submit}
        </Button>
      </form>
    </AuthCard>
  );
}
