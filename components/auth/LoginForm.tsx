"use client";

import { useActionState, useState } from "react";
import { signInWithPassword } from "@/lib/actions/auth";
import { useDictionary } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Card de login (Figma "Login — Dark"). Email + senha; sem estado de "link
 * enviado" (AAA-222 substituiu magic link por senha).
 */
export function LoginForm({ next }: { next: string }) {
  const t = useDictionary();
  const [state, formAction, pending] = useActionState(
    signInWithPassword,
    null,
  );
  // Controlado só para sobreviver ao reset de formulário do React 19 após a
  // action rodar -- assim o email digitado continua visível num submit que
  // falhou. A senha fica não controlada de propósito: deve ser limpa.
  const [email, setEmail] = useState("");
  const hasError = state?.ok === false;

  return (
    <div className="relative w-full">
      {/* Fio de luz: linha lime de 1px no topo do card. */}
      <div
        aria-hidden
        className="absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-primary/55 to-transparent"
      />
      <div className="flex flex-col gap-8 rounded-lg border border-border bg-card p-8 shadow-overlay">
        <div className="flex flex-col gap-3">
          <p className="text-brand-pixel text-brand-accent">
            {t.auth.login.personalLibraryBadge}
          </p>
          <h1 className="text-headline-lg">Muvuca</h1>
          <p className="text-body-md text-muted-foreground">
            {t.auth.login.pitch}
          </p>
        </div>
        <form action={formAction} className="flex flex-col gap-4">
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
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-describedby={hasError ? "credentials-error" : undefined}
              aria-invalid={hasError || undefined}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-label-md">
              {t.auth.login.passwordLabel}
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              maxLength={72}
              autoComplete="current-password"
              required
              aria-describedby={hasError ? "credentials-error" : undefined}
              aria-invalid={hasError || undefined}
            />
            {hasError && (
              <p
                id="credentials-error"
                role="alert"
                aria-live="polite"
                className="text-body-sm [overflow-wrap:anywhere] text-destructive"
              >
                {state.message}
              </p>
            )}
            {/* Commit B (AAA-222 follow-up) adiciona "Esqueci a senha" aqui. */}
          </div>
          <Button
            type="submit"
            className="w-full"
            pending={pending}
            pendingLabel={t.auth.login.signingIn}
          >
            {t.auth.login.signIn}
          </Button>
        </form>
        <p className="text-metadata text-muted-foreground">
          {t.auth.login.noSignupHint}
        </p>
      </div>
    </div>
  );
}
