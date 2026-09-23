"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getOptionalUser } from "@/lib/auth/require-user";
import { getDictionary } from "@/lib/i18n/server";
import { logEvent } from "@/lib/security/logging";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/utils/result";
import { localeSchema, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Persists the UI locale. Works logged-out (cookie only) and logged-in
 * (saved preference + cookie). The DB upsert only runs when there is a
 * session, and the user id always comes from that session, never from the
 * caller's input. The cookie is written last, only after the upsert
 * succeeded: a failed save must not leave a cookie that flips the language
 * on the next request while the UI has already rolled back and reported
 * the error.
 */
export async function setLocale(
  locale: unknown,
): Promise<ActionResult<Locale>> {
  const t = await getDictionary();
  const parsed = localeSchema.safeParse(locale);
  if (!parsed.success) {
    return fail("VALIDATION_FAILED", t.errors.invalidInput);
  }

  const user = await getOptionalUser();
  if (user) {
    const supabase = await createClient();
    const { error } = await supabase
      .from("user_preferences")
      .upsert(
        { user_id: user.id, locale: parsed.data },
        { onConflict: "user_id" },
      );

    if (error) {
      logEvent({
        event: "preferences.locale_update_failed",
        status: "failure",
        userId: user.id,
        errorClass: error.name,
      });
      return fail("UNKNOWN", t.errors.unknown);
    }

    logEvent({
      event: "preferences.locale_updated",
      status: "success",
      userId: user.id,
    });
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, parsed.data, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: ONE_YEAR_SECONDS,
  });

  revalidatePath("/", "layout");
  return ok(parsed.data);
}
