import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email: string | undefined;
  name?: string | null;
};

/**
 * Verifies identity with `getClaims()` -- never `getSession()`'s
 * cookie-loaded object, which is not proof of identity on its own. Thin
 * wrapper only; no domain queries live here.
 */
async function currentUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return null;
  }

  const userMeta = data.claims.user_metadata as
    Record<string, unknown> | undefined;
  const name =
    typeof userMeta?.full_name === "string"
      ? userMeta.full_name
      : typeof userMeta?.name === "string"
        ? userMeta.name
        : null;

  return {
    id: data.claims.sub,
    email: data.claims.email,
    name,
  };
}

/** Protects a route: redirects to `/login` when there is no valid session. */
export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

/**
 * Narrows an unknown `amr` claim to "does it contain a `recovery` entry".
 * GoTrue can emit AMR either as detailed objects (`{ method, timestamp }`)
 * or as bare RFC-8176 strings (`"password"`) -- only the object form
 * actually carries a `method` to check, so a bare-string entry never
 * matches. No assertions: every level is checked before being read.
 */
function hasRecoveryMethod(amr: unknown): boolean {
  if (!Array.isArray(amr)) return false;

  return amr.some(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      "method" in entry &&
      (entry as { method: unknown }).method === "recovery",
  );
}

/**
 * True only when the *current* session was born from a password-recovery
 * email, never from an ordinary password login. This is the guard
 * `updatePassword` (`lib/actions/auth.ts`) and `/reset-password`
 * (`app/(auth)/reset-password/page.tsx`) both call before letting a
 * session change the account's password: a session obtained by normal
 * login -- e.g. a stolen cookie -- must not be able to do that, only a
 * session that exists *because* the user clicked the emailed recovery
 * link should be able to. Supabase stamps `amr` with a `recovery` entry
 * exactly on that path (verified empirically against the local stack's
 * `exchangeCodeForSession` flow for `resetPasswordForEmail`'s link).
 */
export async function hasRecoverySession(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) return false;

  return hasRecoveryMethod(data.claims.amr);
}

/** Reads the session without redirecting; `null` when unauthenticated. */
export async function getOptionalUser(): Promise<SessionUser | null> {
  return currentUser();
}
