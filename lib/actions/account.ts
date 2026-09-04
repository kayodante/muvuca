"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";
import { logEvent } from "@/lib/security/logging";
import { removeAllUserPreviewObjects } from "@/lib/storage/previews";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/utils/result";

/**
 * "Começar do zero" (settings): apaga todo dado de domínio do usuário via
 * `reset_account` (0020_reset_account.sql) e deixa a conta como recém
 * criada. auth.users não é tocado -- a sessão continua válida.
 */
export async function resetAccount(): Promise<ActionResult<null>> {
  const user = await requireUser();
  const supabase = await createClient();

  // Best-effort: resetting the account must also clean the user's own
  // Storage folder. Objects live two levels
  // deep (`${userId}/${itemId}/file.webp`); removeAllUserPreviewObjects()
  // paginates through every item-folder under the user's own prefix and
  // wipes each one via the same helper deleteItem uses. Runs before the
  // RPC, and a failure here never blocks the reset itself.
  try {
    await removeAllUserPreviewObjects(supabase, user.id);
  } catch (error) {
    logEvent({
      event: "preview.cleanup_failed",
      status: "failure",
      errorClass: error instanceof Error ? error.name : "UnknownError",
      userId: user.id,
    });
  }

  const { error } = await supabase.rpc("reset_account");

  if (error) {
    logEvent({
      event: "account.reset_failed",
      status: "failure",
      errorClass: error.code,
      userId: user.id,
    });
    return fail("UNKNOWN", "Não foi possível apagar os dados da conta.");
  }

  logEvent({ event: "account.reset", status: "success", userId: user.id });

  revalidatePath("/library");
  revalidatePath("/tags", "layout");
  revalidatePath("/settings");

  return ok(null);
}
