"use client";

import { toast as sonnerToast } from "sonner";

/**
 * Short toast for create/edit/import, no modal for trivial actions.
 * Thin wrapper around sonner's imperative API so every call site passes
 * through um ponto só; `<Toaster />` (components/ui/sonner.tsx) é montado
 * uma vez em app/layout.tsx.
 *
 * O import direto de `sonner` está bloqueado por `no-restricted-imports`
 * (eslint.config.mjs). Sem a regra, o próximo call site volta a importar
 * direto e este arquivo vira de novo o que era antes da AAA-214: uma
 * indireção que ninguém usa. Se um call site precisar de algo que não
 * está aqui (`promise`, options, duração), acrescente a função — não
 * abra exceção na regra.
 */
export function toastSuccess(message: string): void {
  sonnerToast.success(message);
}

export function toastError(message: string): void {
  sonnerToast.error(message);
}

/** Aviso neutro: nem falha nem confirmação, só "não havia o que fazer". */
export function toastInfo(message: string): void {
  sonnerToast(message);
}
