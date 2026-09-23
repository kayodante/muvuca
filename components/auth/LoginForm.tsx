"use client";

import { useActionState, useState } from "react";
import { CheckIcon } from "lucide-react";
import { signInWithMagicLink } from "@/lib/actions/auth";
import { useDictionary } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Card de login (Figma "Login — Dark" / "Login — Link enviado"). Os dois
 * estados dividem o mesmo card: formulário e confirmação de link enviado.
 */
export function LoginForm({ next }: { next: string }) {
  const t = useDictionary();
  const [state, formAction, pending] = useActionState(
    signInWithMagicLink,
    null,
  );
  // "Usar outro email" volta ao formulário sem descartar o resultado da
  // action; um novo submit reativa a tela de confirmação.
  const [restarted, setRestarted] = useState(false);
  const sent = state?.ok === true && !restarted;

  return (
    <div className="relative w-full">
      {/* Fio de luz: linha lime de 1px no topo do card. */}
      <div
        aria-hidden
        className="absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-primary/55 to-transparent"
      />
      <div className="flex flex-col gap-8 rounded-lg border border-border bg-card p-8 shadow-overlay">
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
                {t.auth.login.linkSentBadge}
              </p>
              <h1 className="text-headline-lg">
                {t.auth.login.checkEmailTitle}
              </h1>
              <p className="text-body-md text-muted-foreground">
                {t.auth.login.checkEmailBody}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setRestarted(true)}
            >
              {t.auth.login.useAnotherEmail}
            </Button>
            <p className="text-metadata text-muted-foreground">
              {t.auth.login.resendHint}
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <p className="text-brand-pixel text-brand-accent">
                {t.auth.login.personalLibraryBadge}
              </p>
              <h1 className="text-headline-lg">Muvuca</h1>
              <p className="text-body-md text-muted-foreground">
                {t.auth.login.pitch}
              </p>
            </div>
            <form
              action={(formData: FormData) => {
                setRestarted(false);
                formAction(formData);
              }}
              className="flex flex-col gap-4"
            >
              <input type="hidden" name="next" value={next} />
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
                  aria-describedby={
                    state?.ok === false ? "email-error" : undefined
                  }
                  aria-invalid={state?.ok === false || undefined}
                />
                {state?.ok === false && (
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
                pendingLabel={t.auth.login.sendingLink}
              >
                {t.auth.login.sendLink}
              </Button>
            </form>
            <p className="text-metadata text-muted-foreground">
              {t.auth.login.passwordlessHint}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
