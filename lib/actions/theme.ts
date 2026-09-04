"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { logEvent } from "@/lib/security/logging";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/utils/result";
import { themeSchema, type Theme } from "@/lib/theme/preference";

/**
 * Persists the authenticated user's theme preference.
 * The root layout is revalidated so the class reaches `<html>` on the next
 * render without client-side theme state or a flash of the old theme.
 */
export async function setTheme(theme: unknown): Promise<ActionResult<Theme>> {
  const parsed = themeSchema.safeParse(theme);
  if (!parsed.success) {
    return fail("VALIDATION_FAILED", "Tema inválido.");
  }

  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_preferences")
    .upsert(
      { user_id: user.id, theme: parsed.data },
      { onConflict: "user_id" },
    );

  if (error) {
    logEvent({
      event: "preferences.theme_update_failed",
      status: "failure",
      userId: user.id,
      errorClass: error.name,
    });
    return fail("UNKNOWN", "Não foi possível atualizar a aparência.");
  }

  logEvent({
    event: "preferences.theme_updated",
    status: "success",
    userId: user.id,
  });

  revalidatePath("/", "layout");
  return ok(parsed.data);
}
