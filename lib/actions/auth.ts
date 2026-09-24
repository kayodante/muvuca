"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
} from "@/lib/validation/auth";
import { safeRedirectTarget, DEFAULT_REDIRECT } from "@/lib/security/redirects";
import { getEnv } from "@/lib/validation/env";
import { getDictionary } from "@/lib/i18n/server";
import { translateFieldErrors } from "@/lib/i18n/validation";
import { logEvent } from "@/lib/security/logging";
import { hasRecoverySession } from "@/lib/auth/require-user";
import { ok, fail, type ActionResult } from "@/lib/utils/result";

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

/**
 * Requests a password-recovery email. Always returns the same generic
 * success shape regardless of whether the account exists or Supabase's
 * rate limit kicked in -- account enumeration through this response is a
 * listed threat. Validation failures (malformed email) are the one case
 * that surfaces a real error, since those reveal nothing about account
 * existence.
 */
export async function requestPasswordReset(
  _prevState: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const t = await getDictionary();
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return fail(
      "VALIDATION_FAILED",
      t.errors.invalidEmail,
      translateFieldErrors(parsed.error.flatten().fieldErrors, t),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: (() => {
        const url = new URL("/auth/confirm", getEnv().NEXT_PUBLIC_APP_URL);
        url.searchParams.set("next", "/reset-password");
        return url.toString();
      })(),
    },
  );

  if (error) {
    logEvent({
      event: "auth.password_reset_request_failed",
      status: "failure",
      errorClass: error.name,
    });
  }

  return ok(null);
}

/**
 * Sets a new password from `/reset-password`. Requires the *current*
 * session to be a recovery-flow session (`hasRecoverySession()`) -- checked
 * again here even though the page already checks it, because this is a
 * Server Action and can be invoked directly. An ordinary logged-in
 * session, even a stolen one, must not be able to reach `updateUser` this
 * way, so the guard runs before it and denies rather than falling back to
 * anything permissive.
 *
 * On success every *other* session for the account is revoked
 * (`signOut({ scope: "others" })`) so a session that leaked before the
 * reset stops working immediately. That call's own failure is logged but
 * never fails the action -- the password itself is already changed by
 * that point, and reporting failure here would be misleading.
 */
export async function updatePassword(
  _prevState: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const t = await getDictionary();
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return fail(
      "VALIDATION_FAILED",
      t.errors.invalidInput,
      translateFieldErrors(parsed.error.flatten().fieldErrors, t),
    );
  }

  if (!(await hasRecoverySession())) {
    return fail("FORBIDDEN", t.errors.recoverySessionExpired);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    logEvent({
      event: "auth.password_update_failed",
      status: "failure",
      errorClass: error.name,
    });

    if (error.code === "same_password") {
      return fail("UNKNOWN", t.errors.passwordSameAsCurrent);
    }
    if (error.code === "weak_password") {
      return fail("UNKNOWN", t.errors.weakPassword);
    }
    return fail("UNKNOWN", t.errors.unknown);
  }

  const { error: signOutOthersError } = await supabase.auth.signOut({
    scope: "others",
  });

  if (signOutOthersError) {
    logEvent({
      event: "auth.password_update_signout_others_failed",
      status: "failure",
      errorClass: signOutOthersError.name,
    });
  }

  redirect(DEFAULT_REDIRECT);
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
