"use client";

import { useActionState, useState } from "react";
import { CheckIcon } from "lucide-react";
import { signInWithMagicLink } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Card de login (Figma "Login — Dark" / "Login — Link enviado"). Os dois
 * estados dividem o mesmo card: formulário e confirmação de link enviado.
 */
export function LoginForm({ next }: { next: string }) {
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
              <p className="text-brand-pixel text-brand-accent">LINK ENVIADO</p>
              <h1 className="text-headline-lg">Verifique seu email</h1>
              <p className="text-body-md text-muted-foreground">
                Se esse email tiver uma conta, enviamos um link de acesso.
                Confira sua caixa de entrada.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setRestarted(true)}
            >
              Usar outro email
            </Button>
            <p className="text-metadata text-muted-foreground">
              Não recebeu? Verifique a pasta de spam.
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <p className="text-brand-pixel text-brand-accent">
                BIBLIOTECA PESSOAL
              </p>
              <h1 className="text-headline-lg">Muvuca</h1>
              <p className="text-body-md text-muted-foreground">
                Salve links e prompts, organize por tags aninhadas e reencontre
                tudo em segundos.
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
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  maxLength={320}
                  placeholder="voce@email.com"
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
                pendingLabel="Enviando link de acesso"
              >
                Enviar link de acesso
              </Button>
            </form>
            <p className="text-metadata text-muted-foreground">
              Sem senha — enviamos um link de acesso por email.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
