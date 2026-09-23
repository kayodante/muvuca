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
    // `*`, não "theme, display_name, locale": o deploy do app não espera
    // o job `migrate` (aprovação manual). Com o schema anterior à 0029,
    // um select nomeado dá 42703 em toda página logada; `*` só não traz a
    // coluna e o valor cai para null.
    // ponytail: voltar ao select nomeado quando a 0029/0030 estiverem em
    // produção.
    .select("*")
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
