import { createClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/security/logging";
import { DEFAULT_THEME, themeSchema, type Theme } from "@/lib/theme/preference";

export type UserPreferences = {
  theme: Theme;
  displayName: string | null;
};

/**
 * Reads the caller's saved preferences through RLS. No row is the
 * intentional first-use state: `system` theme and no display name.
 */
export async function getUserPreferences(): Promise<UserPreferences> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_preferences")
    .select("theme, display_name")
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
  return {
    theme: parsed.success ? parsed.data : DEFAULT_THEME,
    displayName: data?.display_name ?? null,
  };
}
