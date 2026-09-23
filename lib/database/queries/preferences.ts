import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/security/logging";
import { DEFAULT_THEME, themeSchema, type Theme } from "@/lib/theme/preference";
import { localeSchema, type Locale } from "@/lib/i18n/config";

export type UserPreferences = {
  theme: Theme;
  displayName: string | null;
  locale: Locale | null;
};

/**
 * Reads the caller's saved preferences through RLS. No row is the
 * intentional first-use state: `system` theme, no display name, no saved
 * locale (falls back to cookie/browser language).
 *
 * Wrapped in `cache()` so the root layout (theme) and `lib/i18n/server.ts`
 * (locale) share one read per request instead of two.
 */
export const getUserPreferences = cache(async (): Promise<UserPreferences> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_preferences")
    // Uma coluna nova aqui só entra depois que a migration dela estiver em
    // produção: o deploy do app no Vercel não espera o job `migrate`
    // (aprovação manual), e uma coluna ausente dá 42703 em toda página
    // logada.
    .select("theme, display_name, locale")
    .maybeSingle();

  if (error) {
    logEvent({
      event: "preferences.get_failed",
      status: "failure",
      errorClass: error.code ?? error.name,
    });
    throw error;
  }

  const theme = themeSchema.safeParse(data?.theme);
  const locale = localeSchema.safeParse(data?.locale);
  return {
    theme: theme.success ? theme.data : DEFAULT_THEME,
    displayName: data?.display_name ?? null,
    locale: locale.success ? locale.data : null,
  };
});
