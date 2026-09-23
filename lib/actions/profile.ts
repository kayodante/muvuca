"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { logEvent } from "@/lib/security/logging";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/utils/result";
import { displayNameSchema } from "@/lib/profile/display-name";

/**
 * Salva como o usuário quer ser chamado; `null` limpa. O upsert só manda
 * `display_name`, então o tema da mesma linha não é tocado.
 */
export async function setDisplayName(
  displayName: unknown,
): Promise<ActionResult<string | null>> {
  const parsed = displayNameSchema.safeParse(displayName);
  if (!parsed.success) {
    return fail(
      "VALIDATION_FAILED",
      parsed.error.issues[0]?.message ?? "Nome inválido.",
    );
  }

  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_preferences")
    .upsert(
      { user_id: user.id, display_name: parsed.data },
      { onConflict: "user_id" },
    );

  if (error) {
    logEvent({
      event: "preferences.display_name_update_failed",
      status: "failure",
      userId: user.id,
      errorClass: error.name,
    });
    return fail("UNKNOWN", "Não foi possível salvar seu nome.");
  }

  logEvent({
    event: "preferences.display_name_updated",
    status: "success",
    userId: user.id,
  });

  revalidatePath("/", "layout");
  return ok(parsed.data);
}
