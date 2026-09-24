import { getDictionary } from "@/lib/i18n/server";

/**
 * Generic, recoverable error notice for the login/callback surface: an
 * invalid callback -- expired/reused login link *or* an invalid
 * password-recovery link, both of which land on `/login?error=auth_failed`
 * via `app/auth/confirm/route.ts` -- always shows this generic message,
 * never the underlying Supabase error. Async Server Component (its one
 * caller, `app/(auth)/login/page.tsx`, is already async) -- no client
 * state needed just to read the dictionary.
 */
export async function AuthErrorState() {
  const t = await getDictionary();
  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      {t.auth.loginFailedMessage}
    </div>
  );
}
