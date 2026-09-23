import { getDictionary } from "@/lib/i18n/server";

/**
 * Generic, recoverable error notice for the login/callback surface: an
 * invalid callback always shows a generic recoverable error, never the
 * underlying Supabase error message. Async Server Component (its one
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
