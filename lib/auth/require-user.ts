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
 * How long after clicking the recovery link the session may still change
 * the password. GoTrue keeps the `recovery` AMR entry for the whole life of
 * the session -- refreshes preserve it -- so without a window the session
 * the user keeps browsing with after the reset could change the password
 * again hours later, e.g. from a stolen cookie.
 */
const RECOVERY_WINDOW_SECONDS = 15 * 60;

/**
 * True when `amr` has a `recovery` entry stamped within the last
 * `RECOVERY_WINDOW_SECONDS`. GoTrue emits AMR entries as
 * `{ method, timestamp }` (timestamp in epoch seconds); anything else --
 * a bare RFC-8176 string, a missing timestamp -- never matches.
 */
export function hasFreshRecoveryEntry(
  amr: unknown,
  nowSeconds: number,
): boolean {
  if (!Array.isArray(amr)) return false;

  return amr.some(
    (entry: unknown) =>
      typeof entry === "object" &&
      entry !== null &&
      "method" in entry &&
      entry.method === "recovery" &&
      "timestamp" in entry &&
      typeof entry.timestamp === "number" &&
      nowSeconds - entry.timestamp <= RECOVERY_WINDOW_SECONDS,
  );
}

/**
 * True only when the *current* session was born from a password-recovery
 * email moments ago, never from an ordinary password login. This is the
 * guard `updatePassword` (`lib/actions/auth.ts`) and `/reset-password`
 * (`app/(auth)/reset-password/page.tsx`) both call before letting a
 * session change the account's password: a session obtained by normal
 * login -- e.g. a stolen cookie -- must not be able to do that. Supabase
 * stamps `amr` with a `recovery` entry exactly on that path (verified
 * against the local stack's `exchangeCodeForSession` flow for
 * `resetPasswordForEmail`'s link).
 */
export async function hasRecoverySession(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) return false;

  return hasFreshRecoveryEntry(data.claims.amr, Math.floor(Date.now() / 1000));
}

/** Reads the session without redirecting; `null` when unauthenticated. */
export async function getOptionalUser(): Promise<SessionUser | null> {
  return currentUser();
}
