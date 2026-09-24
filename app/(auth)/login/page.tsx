import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/auth/require-user";
import { safeRedirectTarget } from "@/lib/security/redirects";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthErrorState } from "@/components/states/AuthErrorState";
import { AuthShell } from "@/components/auth/AuthShell";

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
    <AuthShell errorSlot={params.error ? <AuthErrorState /> : undefined}>
      <LoginForm next={next} />
    </AuthShell>
  );
}
