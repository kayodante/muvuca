import { redirect } from "next/navigation";
import { hasRecoverySession } from "@/lib/auth/require-user";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

/**
 * Guards itself: only a recovery-flow session (from clicking the emailed
 * link) may reach this form -- see `hasRecoverySession` in
 * `lib/auth/require-user.ts` for why. Not added to `proxy.ts`'s protected
 * regex: that regex only ever checks "is there any session", which an
 * ordinary logged-in visitor already has, so it can't express this
 * recovery-only rule.
 */
export default async function ResetPasswordPage() {
  if (!(await hasRecoverySession())) {
    redirect("/login?error=auth_failed");
  }

  return (
    <AuthShell>
      <ResetPasswordForm />
    </AuthShell>
  );
}
