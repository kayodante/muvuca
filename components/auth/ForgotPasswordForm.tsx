"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckIcon } from "lucide-react";
import { requestPasswordReset } from "@/lib/actions/auth";
import { useDictionary } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/auth/AuthCard";

/**
 * "Esqueci a senha" card. Reaproveita o padrão de duas telas (formulário /
 * confirmação de envio) do antigo LoginForm de magic link
 * (`git show HEAD~1:components/auth/LoginForm.tsx`) porque a resposta da
 * action é deliberadamente idêntica sempre, exista ou não a conta
 * (anti-enumeração) -- exatamente a mesma UX que fazia sentido lá.
 */
export function ForgotPasswordForm() {
  const t = useDictionary();
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    null,
  );
  // "Usar outro email" volta ao formulário sem descartar o resultado da
  // action; um novo submit reativa a tela de confirmação.
  const [restarted, setRestarted] = useState(false);
  const sent = state?.ok === true && !restarted;
  const hasError = state?.ok === false;
  // Controlado para sobreviver ao reset de formulário do React 19 após a
  // action rodar -- o email digitado continua visível num submit que falhou.
  const [email, setEmail] = useState("");

  return (
    <AuthCard>
      {sent ? (
        <>
          <div
            aria-hidden
            className="flex size-10 items-center justify-center rounded-full border border-primary/35 bg-primary/15 text-brand-accent"
          >
            <CheckIcon className="size-4" />
          </div>
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col gap-3"
          >
            <p className="text-brand-pixel text-brand-accent">
              {t.auth.forgotPassword.linkSentBadge}
            </p>
            <h1 className="text-headline-lg">
              {t.auth.forgotPassword.checkEmailTitle}
            </h1>
            <p className="text-body-md text-muted-foreground">
              {t.auth.forgotPassword.checkEmailBody}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => setRestarted(true)}
          >
            {t.auth.forgotPassword.useAnotherEmail}
          </Button>
          <p className="text-metadata text-muted-foreground">
            {t.auth.forgotPassword.resendHint}
          </p>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <p className="text-brand-pixel text-brand-accent">
              {t.auth.forgotPassword.badge}
            </p>
            <h1 className="text-headline-lg">
              {t.auth.forgotPassword.title}
            </h1>
            <p className="text-body-md text-muted-foreground">
              {t.auth.forgotPassword.pitch}
            </p>
          </div>
          <form
            action={(formData: FormData) => {
              setRestarted(false);
              formAction(formData);
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-label-md">
                {t.auth.login.emailLabel}
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                maxLength={320}
                placeholder={t.auth.login.emailPlaceholder}
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-describedby={hasError ? "email-error" : undefined}
                aria-invalid={hasError || undefined}
              />
              {hasError && (
                <p
                  id="email-error"
                  role="alert"
                  aria-live="polite"
                  className="text-body-sm [overflow-wrap:anywhere] text-destructive"
                >
                  {state.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              pending={pending}
              pendingLabel={t.auth.forgotPassword.sending}
            >
              {t.auth.forgotPassword.submit}
            </Button>
          </form>
        </>
      )}
      <Link
        href="/login"
        className="self-center text-body-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {t.auth.forgotPassword.backToLogin}
      </Link>
    </AuthCard>
  );
}
