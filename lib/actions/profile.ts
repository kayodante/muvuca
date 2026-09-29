"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { getDictionary } from "@/lib/i18n/server";
import { translateIssue } from "@/lib/i18n/validation";
import { processAvatar, type ProcessedImage } from "@/lib/metadata/image";
import { PreviewError } from "@/lib/metadata/errors";
import { logEvent } from "@/lib/security/logging";
import {
  avatarObjectKey,
  putAvatarObject,
  removeAvatarObjects,
} from "@/lib/storage/avatars";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/utils/result";
import { displayNameSchema } from "@/lib/profile/display-name";
import { avatarFileSchema } from "@/lib/profile/avatar";

/**
 * Salva como o usuário quer ser chamado; `null` limpa. O upsert só manda
 * `display_name`, então o tema da mesma linha não é tocado.
 */
export async function setDisplayName(
  displayName: unknown,
): Promise<ActionResult<string | null>> {
  const t = await getDictionary();
  const parsed = displayNameSchema.safeParse(displayName);
  if (!parsed.success) {
    return fail(
      "VALIDATION_FAILED",
      translateIssue(parsed.error.issues[0]?.message ?? "", t),
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
    return fail("UNKNOWN", t.errors.displayNameSaveFailed);
  }

  logEvent({
    event: "preferences.display_name_updated",
    status: "success",
    userId: user.id,
  });

  revalidatePath("/", "layout");
  return ok(parsed.data);
}

/**
 * Upload de foto de perfil (ADR-017). `requireUser` roda antes da
 * validação do arquivo: sem sessão, nada do FormData é decodificado para um
 * usuário anônimo. Ordem fixa depois disso: sobe o objeto novo, só então
 * grava o hash (nunca aponta para objeto inexistente) e por último limpa,
 * best-effort, qualquer objeto antigo do prefixo. Retorna o hash novo, que
 * o cliente usa para montar `/api/avatar?v=<hash>`.
 */
export async function setAvatar(
  formData: unknown,
): Promise<ActionResult<string>> {
  const t = await getDictionary();
  const user = await requireUser();

  const file = formData instanceof FormData ? formData.get("avatar") : null;
  const parsedFile = avatarFileSchema.safeParse(file);
  if (!parsedFile.success) {
    const issue = parsedFile.error.issues[0];
    logEvent({
      event: "profile.avatar_rejected",
      status: "failure",
      userId: user.id,
      errorClass:
        issue?.message === "avatarTooLarge" ? "too_large" : "invalid_file",
    });
    return fail("VALIDATION_FAILED", translateIssue(issue?.message ?? "", t));
  }

  let processed: ProcessedImage;
  try {
    processed = await processAvatar(
      Buffer.from(await parsedFile.data.arrayBuffer()),
    );
  } catch (error) {
    logEvent({
      event: "profile.avatar_rejected",
      status: "failure",
      userId: user.id,
      errorClass:
        error instanceof PreviewError
          ? error.code
          : error instanceof Error
            ? error.name
            : "UnknownError",
    });
    return fail("VALIDATION_FAILED", t.validation.avatarUnsupportedFormat);
  }

  const supabase = await createClient();
  const key = avatarObjectKey(user.id, processed.sha256);

  try {
    await putAvatarObject(supabase, key, processed.bytes);
  } catch (error) {
    logEvent({
      event: "profile.avatar_update_failed",
      status: "failure",
      userId: user.id,
      errorClass: error instanceof Error ? error.name : "UnknownError",
    });
    return fail("UNKNOWN", t.errors.avatarSaveFailed);
  }

  const { error } = await supabase
    .from("user_preferences")
    .upsert(
      { user_id: user.id, avatar_hash: processed.sha256 },
      { onConflict: "user_id" },
    );

  if (error) {
    logEvent({
      event: "profile.avatar_update_failed",
      status: "failure",
      userId: user.id,
      errorClass: error.name,
    });
    // O objeto recém-enviado não é apagado nem a limpeza roda aqui: se o
    // hash novo coincidir com o atual, apagar quebraria a foto vigente. O
    // órfão é invisível (nenhum hash aponta para ele) e some na próxima
    // troca, remoção ou reset.
    return fail("UNKNOWN", t.errors.avatarSaveFailed);
  }

  try {
    await removeAvatarObjects(supabase, user.id, processed.sha256);
  } catch (cleanupError) {
    logEvent({
      event: "profile.avatar_cleanup_failed",
      status: "failure",
      userId: user.id,
      errorClass:
        cleanupError instanceof Error ? cleanupError.name : "UnknownError",
    });
  }

  logEvent({
    event: "profile.avatar_updated",
    status: "success",
    userId: user.id,
  });

  revalidatePath("/", "layout");
  return ok(processed.sha256);
}

/** Remove a foto de perfil: zera `avatar_hash` e limpa o prefixo do Storage. */
export async function removeAvatar(): Promise<ActionResult<null>> {
  const t = await getDictionary();
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("user_preferences")
    .upsert({ user_id: user.id, avatar_hash: null }, { onConflict: "user_id" });

  if (error) {
    logEvent({
      event: "profile.avatar_remove_failed",
      status: "failure",
      userId: user.id,
      errorClass: error.name,
    });
    return fail("UNKNOWN", t.errors.avatarRemoveFailed);
  }

  try {
    await removeAvatarObjects(supabase, user.id);
  } catch (cleanupError) {
    logEvent({
      event: "profile.avatar_cleanup_failed",
      status: "failure",
      userId: user.id,
      errorClass:
        cleanupError instanceof Error ? cleanupError.name : "UnknownError",
    });
  }

  logEvent({
    event: "profile.avatar_removed",
    status: "success",
    userId: user.id,
  });

  revalidatePath("/", "layout");
  return ok(null);
}
