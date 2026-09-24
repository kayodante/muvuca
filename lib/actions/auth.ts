"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInSchema } from "@/lib/validation/auth";
import { safeRedirectTarget } from "@/lib/security/redirects";
import { getDictionary } from "@/lib/i18n/server";
import { translateFieldErrors } from "@/lib/i18n/validation";
import { logEvent } from "@/lib/security/logging";
import { fail, type ActionResult } from "@/lib/utils/result";

/**
 * Signs in with email + password. On any authentication failure this
 * returns one generic message regardless of cause -- unknown email, wrong
 * password, unconfirmed email, or anything else Supabase reports -- because
 * account enumeration through the login response is a listed threat. The
 * one exception is rate limiting (HTTP 429): its message is also generic,
 * but distinct, since being told to slow down reveals nothing about
 * whether the account exists either. Validation failures (malformed email,
 * empty password) are a third case that surfaces field-level detail, again
 * for the same reason -- they reveal nothing about account existence.
 */
export async function signInWithPassword(
  _prevState: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const t = await getDictionary();
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return fail(
      "VALIDATION_FAILED",
      t.errors.invalidEmail,
      translateFieldErrors(parsed.error.flatten().fieldErrors, t),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    logEvent({
      event: "auth.password_sign_in_failed",
      status: "failure",
      errorClass: error.name,
    });

    if (error.status === 429) {
      return fail("UNKNOWN", t.errors.tooManyAttempts);
    }

    return fail("INVALID_CREDENTIALS", t.errors.invalidCredentials);
  }

  redirect(safeRedirectTarget(parsed.data.next));
}

/** Signs the user out and redirects to `/login`. */
export async function signOut(): Promise<ActionResult<null>> {
  const t = await getDictionary();
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    logEvent({
      event: "auth.logout_failed",
      status: "failure",
      errorClass: error.name,
    });
    return fail("UNKNOWN", t.errors.signOutFailed);
  }

  redirect("/login");
}
