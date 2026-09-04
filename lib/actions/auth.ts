"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInSchema } from "@/lib/validation/auth";
import { getEnv } from "@/lib/validation/env";
import { DEFAULT_REDIRECT } from "@/lib/security/redirects";
import { logEvent } from "@/lib/security/logging";
import { ok, fail, type ActionResult } from "@/lib/utils/result";

/**
 * Requests a magic link. Always returns the same generic
 * success shape regardless of whether the email exists, is rate-limited,
 * or Supabase Auth returns an error -- account enumeration through the
 * login response is a listed threat. Validation
 * failures (malformed email) are the one case that surfaces a real error,
 * since those reveal nothing about account existence.
 */
export async function signInWithMagicLink(
  _prevState: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return fail(
      "VALIDATION_FAILED",
      "Informe um email válido.",
      parsed.error.flatten().fieldErrors,
    );
  }

  // The exact callback is allowlisted in hosted Supabase. Production's
  // default email template uses it for the PKCE code redirect, while the
  // local custom template still sends token_hash directly to the same route.
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      // Single-user deploy: never provision a new account from this form.
      shouldCreateUser: false,
      emailRedirectTo: (() => {
        const url = new URL("/auth/confirm", getEnv().NEXT_PUBLIC_APP_URL);
        url.searchParams.set("next", parsed.data.next ?? DEFAULT_REDIRECT);
        return url.toString();
      })(),
    },
  });

  if (error) {
    logEvent({
      event: "auth.magic_link_request_failed",
      status: "failure",
      errorClass: error.name,
    });
  }

  return ok(null);
}

/** Signs the user out and redirects to `/login`. */
export async function signOut(): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    logEvent({
      event: "auth.logout_failed",
      status: "failure",
      errorClass: error.name,
    });
    return fail("UNKNOWN", "Não foi possível sair. Tente novamente.");
  }

  redirect("/login");
}
