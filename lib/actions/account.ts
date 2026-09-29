"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";
import { getDictionary } from "@/lib/i18n/server";
import { logEvent } from "@/lib/security/logging";
import { removeAvatarObjects } from "@/lib/storage/avatars";
import { removeAllUserPreviewObjects } from "@/lib/storage/previews";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/utils/result";

/**
 * "Começar do zero" (settings): apaga todo dado de domínio do usuário via
 * `reset_account` (0020_reset_account.sql) e deixa a conta como recém
 * criada. auth.users não é tocado -- a sessão continua válida.
 */
export async function resetAccount(): Promise<ActionResult<null>> {
  const t = await getDictionary();
  const user = await requireUser();
  const supabase = await createClient();

  // Best-effort: resetting the account must also clean the user's own
  // Storage folders -- link previews and the profile photo (ADR-017), each
  // in its own try/catch so a failure in one doesn't skip the other. Both
  // run before the RPC, and neither failure blocks the reset itself.
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

  try {
    await removeAvatarObjects(supabase, user.id);
  } catch (error) {
    logEvent({
      event: "profile.avatar_cleanup_failed",
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
    return fail("UNKNOWN", t.errors.accountResetFailed);
  }

  logEvent({ event: "account.reset", status: "success", userId: user.id });

  revalidatePath("/library", "layout");
  revalidatePath("/tags", "layout");
  revalidatePath("/t", "layout");
  revalidatePath("/settings");

  return ok(null);
}
