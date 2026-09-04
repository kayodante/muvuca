import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email: string | undefined;
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

  return {
    id: data.claims.sub,
    email: data.claims.email,
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

/** Reads the session without redirecting; `null` when unauthenticated. */
export async function getOptionalUser(): Promise<SessionUser | null> {
  return currentUser();
}
