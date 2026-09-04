import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/auth/require-user";
import { safeRedirectTarget } from "@/lib/security/redirects";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthErrorState } from "@/components/states/AuthErrorState";
import { Logo } from "@/components/brand/Logo";
import Auralis from "@/components/ui/auralis";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const user = await getOptionalUser();

  if (user) {
    redirect(safeRedirectTarget(params.next));
  }

  const next = safeRedirectTarget(params.next);

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
        {params.error && <AuthErrorState />}
        <LoginForm next={next} />
      </div>
    </main>
  );
}
