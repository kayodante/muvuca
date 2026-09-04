"use client";

import { toast as sonnerToast } from "sonner";

/**
 * Short toast for create/edit/import, no modal for trivial actions.
 * Thin wrapper around sonner's imperative API
 * so every call site uses the same wording conventions; `<Toaster />`
 * (components/ui/sonner.tsx) is mounted once in app/layout.tsx.
 */
export function toastSuccess(message: string): void {
  sonnerToast.success(message);
}

export function toastError(message: string): void {
  sonnerToast.error(message);
}
