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
    // `*`, não "theme, display_name": o deploy do app não espera o job
    // `migrate` (aprovação manual). Com o schema anterior à 0029, um select
    // nomeado dá 42703 em toda página logada; `*` só não traz a coluna e o
    // nome cai para null.
    // ponytail: voltar ao select nomeado quando a 0029 estiver em produção.
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

  const parsed = themeSchema.safeParse(data?.theme);
  return {
    theme: parsed.success ? parsed.data : DEFAULT_THEME,
    displayName: data?.display_name ?? null,
  };
}
