import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/security/logging";
import { DEFAULT_THEME, themeSchema, type Theme } from "@/lib/theme/preference";
import { localeSchema, type Locale } from "@/lib/i18n/config";

export type UserPreferences = {
  theme: Theme;
  displayName: string | null;
  locale: Locale | null;
  avatarHash: string | null;
};

/**
 * Reads the caller's saved preferences through RLS. No row is the
 * intentional first-use state: `system` theme, no display name, no saved
 * locale (falls back to cookie/browser language), no avatar.
 *
 * Wrapped in `cache()` so the root layout (theme) and `lib/i18n/server.ts`
 * (locale) share one read per request instead of two.
 */
export const getUserPreferences = cache(async (): Promise<UserPreferences> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_preferences")
    // Temporário (AAA-244/ADR-017): `avatar_hash` só entra na migration
    // 0035, e o deploy do app no Vercel não espera o job `migrate` (aprovação
    // manual) terminar -- uma coluna nomeada aqui que ainda não existe em
    // produção dá 42703 em toda página logada. `select("*")` sobrevive à
    // janela: com `*`, a ausência da coluna em produção vira `undefined` ->
    // `null` abaixo -> iniciais no lugar da foto. Depois que a 0035 chegar à
    // produção, volta a listar as colunas nomeadas, incluindo
    // `avatar_hash` (precedente: commit 86d432d, AAA-218, mesma janela para
    // `display_name`).
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
    avatarHash: data?.avatar_hash ?? null,
  };
});
