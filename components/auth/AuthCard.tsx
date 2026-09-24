import type { ReactNode } from "react";

/**
 * Card chrome shared by every auth form: the 1px lime top line + bordered
 * card from the Figma "Login — Dark" comp. No hooks, so client forms
 * (LoginForm, ForgotPasswordForm, ResetPasswordForm) can wrap themselves in
 * it directly.
 */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full">
      {/* Fio de luz: linha lime de 1px no topo do card. */}
      <div
        aria-hidden
        className="absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-primary/55 to-transparent"
      />
      <div className="flex flex-col gap-8 rounded-lg border border-border bg-card p-8 shadow-overlay">
        {children}
      </div>
    </div>
  );
}
