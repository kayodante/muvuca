"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";
import { logEvent } from "@/lib/security/logging";
import { createClient } from "@/lib/supabase/server";
import { itemIdSchema, previewScopeSchema } from "@/lib/validation/item";
import {
  fail,
  mapPostgresErrorCode,
  ok,
  type ActionResult,
} from "@/lib/utils/result";

type PostgrestErrorLike = { code?: string };

function mapRefreshError(error: PostgrestErrorLike): ActionResult<never> {
  if (error.code === "P0001") {
    return fail("NOT_FOUND", "Preview não encontrado.");
  }
  switch (mapPostgresErrorCode(error.code)) {
    case "CONSTRAINT_VIOLATION":
      return fail(
        "CONSTRAINT_VIOLATION",
        "Não foi possível atualizar o preview.",
      );
    default:
      return fail("UNKNOWN", "Não foi possível concluir a operação.");
  }
}

/** Manual "refresh preview" action, consumed by the item card's UI. */
export async function refreshItemPreview(
  itemId: string,
): Promise<ActionResult<null>> {
  const parsed = itemIdSchema.safeParse(itemId);
  if (!parsed.success) return fail("VALIDATION_FAILED", "Item inválido.");

  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.rpc("request_preview_refresh", {
    p_item_id: parsed.data,
  });

  if (error) {
    logEvent({
      event: "preview.refresh_failed",
      status: "failure",
      errorClass: error.code,
      userId: user.id,
      entityId: parsed.data,
    });
    return mapRefreshError(error);
  }

  // Mirrors lib/actions/items.ts's revalidateLibrary() pattern: the row
  // just flipped to `pending` server-side, and without this the page's
  // stale `items` payload never sees it, so the pending state never shows
  // and the refresh sits queued until a hard reload.
  revalidatePath("/library");

  return ok(null);
}

/** Botão "Atualizar pré-visualizações": reagenda as prévias não-`ready` da
 * página visível e devolve quantas voltaram para a fila. A drenagem em si
 * é o `drainPreviewQueue` (agora em `lib/previews/drain.ts`) que o cliente
 * aciona via `POST /api/previews/drain` logo depois. */
export async function reschedulePreviewsForItems(
  itemIds: string[],
): Promise<ActionResult<{ rescheduled: number }>> {
  const parsed = previewScopeSchema.safeParse(itemIds);
  if (!parsed.success) {
    return fail("VALIDATION_FAILED", "Escopo de prévias inválido.");
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "request_preview_reschedule_for_items",
    { p_item_ids: parsed.data },
  );

  if (error) {
    logEvent({
      event: "preview.reschedule_failed",
      status: "failure",
      errorClass: error.code,
      userId: user.id,
    });
    return fail("UNKNOWN", "Não foi possível atualizar as prévias.");
  }

  return ok({ rescheduled: data ?? 0 });
}
