"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";
import { backupPayloadSchema } from "@/lib/backup/validation";
import { logEvent } from "@/lib/security/logging";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/utils/result";
import { normalizeHttpUrl } from "@/lib/validation/item";

export type BackupImportSummary = {
  itemsImported: number;
  tagsCreated: number;
  duplicatesIgnored: number;
};

export async function importLibraryBackup(
  input: unknown,
): Promise<ActionResult<BackupImportSummary>> {
  const parsed = backupPayloadSchema.safeParse(input);
  if (!parsed.success) {
    // Só os caminhos dos campos (ex.: "items.3.title") -- nunca a mensagem do
    // Zod nem o valor que falhou, que ecoaria conteúdo do usuário no log.
    const issuePaths = parsed.error.issues
      .slice(0, 3)
      .map((issue) => issue.path.join("."));
    logEvent({
      event: "backup.import_validation_failed",
      status: "failure",
      errorClass: `VALIDATION_FAILED:${issuePaths.join(",")}`,
    });
    return fail(
      "VALIDATION_FAILED",
      "O arquivo de backup precisa ser analisado novamente.",
    );
  }

  // Backup vazio é válido e não exige escritas no banco
  if (parsed.data.tags.length === 0 && parsed.data.items.length === 0) {
    return ok({
      itemsImported: 0,
      tagsCreated: 0,
      duplicatesIgnored: 0,
    });
  }

  const user = await requireUser();
  const supabase = await createClient();

  // A normalização da URL é calculada no servidor (fronteira confiável)
  // antes de despachar para a RPC. O cliente não transporta normalizedUrl.
  const rpcItems = parsed.data.items.map((item) => {
    if (item.type === "link") {
      return {
        ...item,
        normalizedUrl: normalizeHttpUrl(item.url!),
      };
    }
    if (item.type === "code_component" && item.url) {
      return {
        ...item,
        normalizedUrl: normalizeHttpUrl(item.url),
      };
    }
    return {
      ...item,
      normalizedUrl: null,
    };
  });

  const { data, error } = await supabase.rpc("import_library_backup", {
    p_tags: parsed.data.tags,
    p_items: rpcItems,
  });

  const summary = data?.[0];
  if (error || !summary) {
    logEvent({
      event: "backup.import_failed",
      status: "failure",
      errorClass: error?.code,
      userId: user.id,
    });
    return fail("UNKNOWN", "Não foi possível concluir a restauração.");
  }

  revalidatePath("/library");
  revalidatePath("/tags", "layout");

  return ok({
    itemsImported: summary.items_imported,
    tagsCreated: summary.tags_created,
    duplicatesIgnored: summary.duplicates_ignored,
  });
}
