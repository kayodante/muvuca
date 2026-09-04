import { createClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/security/logging";
import { DEFAULT_THEME, themeSchema, type Theme } from "@/lib/theme/preference";

/**
 * Reads the caller's saved theme through RLS. No row is the intentional
 * first-use state, so it resolves to the documented `system` default.
 */
export async function getThemePreference(): Promise<Theme> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_preferences")
    .select("theme")
    .maybeSingle();

  if (error) {
    logEvent({
      event: "preferences.get_failed",
      status: "failure",
      errorClass: error.code ?? error.name,
    });
    throw error;
  }

  const parsed = themeSchema.safeParse(data?.theme);
  return parsed.success ? parsed.data : DEFAULT_THEME;
}
