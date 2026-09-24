import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import Auralis from "@/components/ui/auralis";

/**
 * Page chrome shared by every auth surface (login, forgot-password,
 * reset-password): Auralis background, lime radial glow, centered Logo and
 * a max-w-105 column. Extracted from `app/(auth)/login/page.tsx` so the two
 * new pages don't duplicate it. `errorSlot` renders above `children` (e.g.
 * `<AuthErrorState />` on `/login?error=...`).
 */
export function AuthShell({
  children,
  errorSlot,
}: {
  children: ReactNode;
  errorSlot?: ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6">
      {/* Background ambiente WebGL (Auralis) com paleta Muvuca */}
      <Auralis
        className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-70"
        speed={0.25}
        grain={0.5}
        height="100%"
      />

      {/* Luz lime (topo): brilho radial decorativo do Figma */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 z-1 h-150 [background:radial-gradient(50%_50%_at_50%_50%,color-mix(in_oklch,var(--primary),transparent_80%)_0%,transparent_70%)]"
      />

      <div className="relative z-10 flex w-full max-w-105 flex-col gap-10">
        <Logo size="lg" className="self-center" />
        {errorSlot}
        {children}
      </div>
    </main>
  );
}
