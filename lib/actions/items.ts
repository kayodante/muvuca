"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { drainPreviewQueue } from "@/lib/actions/previews";
import { requireUser } from "@/lib/auth/require-user";
import {
  getLibraryItemById,
  type LibraryItem,
} from "@/lib/database/queries/items";
import type { Database } from "@/lib/database/generated.types";
import { logEvent } from "@/lib/security/logging";
import { deletePreviewObjects } from "@/lib/storage/previews";
import { createClient } from "@/lib/supabase/server";
import {
  createItemSchema,
  itemIdSchema,
  normalizeHttpUrl,
  updateItemSchema,
} from "@/lib/validation/item";
import {
  fail,
  mapPostgresErrorCode,
  ok,
  type ActionResult,
} from "@/lib/utils/result";

type PostgrestErrorLike = { code?: string };

function itemFormData(formData: FormData) {
  const rawUrl = formData.get("url");
  return {
    id: formData.get("id"),
    type: formData.get("type"),
    title: formData.get("title"),
    url: typeof rawUrl === "string" && rawUrl.trim() === "" ? null : rawUrl,
    content: formData.get("content"),
    description: formData.get("description"),
    tagIds: formData.getAll("tagIds"),
  };
}

function mapItemError(error: PostgrestErrorLike): ActionResult<never> {
  if (error.code === "P0001") {
    return fail("NOT_FOUND", "Item ou tags não estão disponíveis.");
  }

  switch (mapPostgresErrorCode(error.code)) {
    case "DUPLICATE":
      return fail("DUPLICATE", "Esse link já está na sua biblioteca.");
    case "CONSTRAINT_VIOLATION":
      return fail("CONSTRAINT_VIOLATION", "Dados do item inválidos.");
    case "INVALID_REFERENCE":
      return fail("INVALID_REFERENCE", "Uma ou mais tags são inválidas.");
    default:
      return fail("UNKNOWN", "Não foi possível concluir a operação.");
  }
}

function revalidateLibrary() {
  revalidatePath("/library");
  revalidatePath("/tags", "layout");
}

/** Reads a full prompt only after the user asks to view or edit it. */
export async function getItemDetails(
  id: string,
): Promise<ActionResult<LibraryItem>> {
  const parsed = itemIdSchema.safeParse(id);
  if (!parsed.success) return fail("VALIDATION_FAILED", "Item inválido.");

  const user = await requireUser();
  try {
    const item = await getLibraryItemById(parsed.data);
    if (!item) return fail("NOT_FOUND", "Item não encontrado.");
    return ok(item);
  } catch (error) {
    logEvent({
      event: "item.detail_failed",
      status: "failure",
      errorClass: error instanceof Error ? error.name : "UnknownError",
      userId: user.id,
      entityId: parsed.data,
    });
    return fail("UNKNOWN", "Não foi possível carregar o item.");
  }
}

/** Creates an item and all selected tag relations in one database transaction. */
export async function createItem(
  _prevState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createItemSchema.safeParse(itemFormData(formData));
  if (!parsed.success) {
    return fail(
      "VALIDATION_FAILED",
      "Verifique os campos do item.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const user = await requireUser();
  const supabase = await createClient();

  let normalizedUrl: string | null = null;
  if (parsed.data.type === "link") {
    normalizedUrl = normalizeHttpUrl(parsed.data.url);
    if (!normalizedUrl) {
      return fail("VALIDATION_FAILED", "Informe uma URL http ou https válida.");
    }
  } else if (parsed.data.type === "code_component" && parsed.data.url) {
    normalizedUrl = normalizeHttpUrl(parsed.data.url);
    if (!normalizedUrl) {
      return fail("VALIDATION_FAILED", "Informe uma URL http ou https válida.");
    }
  }

  const { data, error } = await supabase.rpc("create_library_item", {
    p_type: parsed.data.type,
    p_title: parsed.data.title,
    p_url:
      parsed.data.type === "link"
        ? parsed.data.url
        : parsed.data.type === "code_component" && parsed.data.url
          ? parsed.data.url
          : null,
    p_normalized_url: normalizedUrl,
    p_content:
      parsed.data.type === "prompt" || parsed.data.type === "code_component"
        ? parsed.data.content
        : null,
    p_description: parsed.data.description,
    p_tag_ids: parsed.data.tagIds,
    // PostgreSQL routine parameters accept null; generated RPC args lose that metadata.
  } as unknown as Database["public"]["Functions"]["create_library_item"]["Args"]);

  if (error || !data) {
    logEvent({
      event: "item.create_failed",
      status: "failure",
      errorClass: error?.code,
      userId: user.id,
    });
    return error
      ? mapItemError(error)
      : fail("UNKNOWN", "Não foi possível concluir a operação.");
  }

  revalidateLibrary();

  // Best-effort latency optimization, not a guarantee: after() runs once
  // the response has already been sent, so a failure
  // here can never turn a successful item creation into an error for the
  // caller. The link_previews row stays `pending` either way and the next
  // drain (manual refresh or the next created link) picks it up.
  if (parsed.data.type === "link") {
    after(async () => {
      try {
        await drainPreviewQueue({ limit: 1 });
      } catch (error) {
        logEvent({
          event: "preview.drain",
          status: "failure",
          errorClass: error instanceof Error ? error.name : "UnknownError",
          userId: user.id,
        });
      }
    });
  }

  return ok({ id: data });
}

/** Updates item fields and replaces its tag set atomically. */
export async function updateItem(
  _prevState: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = updateItemSchema.safeParse(itemFormData(formData));
  if (!parsed.success) {
    return fail(
      "VALIDATION_FAILED",
      "Verifique os campos do item.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const user = await requireUser();
  const supabase = await createClient();

  let normalizedUrl: string | null = null;
  if (parsed.data.type === "link") {
    normalizedUrl = normalizeHttpUrl(parsed.data.url);
    if (!normalizedUrl) {
      return fail("VALIDATION_FAILED", "Informe uma URL http ou https válida.");
    }
  } else if (parsed.data.type === "code_component" && parsed.data.url) {
    normalizedUrl = normalizeHttpUrl(parsed.data.url);
    if (!normalizedUrl) {
      return fail("VALIDATION_FAILED", "Informe uma URL http ou https válida.");
    }
  }

  const { error } = await supabase.rpc("update_library_item", {
    p_item_id: parsed.data.id,
    p_type: parsed.data.type,
    p_title: parsed.data.title,
    p_url:
      parsed.data.type === "link"
        ? parsed.data.url
        : parsed.data.type === "code_component" && parsed.data.url
          ? parsed.data.url
          : null,
    p_normalized_url: normalizedUrl,
    p_content:
      parsed.data.type === "prompt" || parsed.data.type === "code_component"
        ? parsed.data.content
        : null,
    p_description: parsed.data.description,
    p_tag_ids: parsed.data.tagIds,
    // PostgreSQL routine parameters accept null; generated RPC args lose that metadata.
  } as unknown as Database["public"]["Functions"]["update_library_item"]["Args"]);

  if (error) {
    logEvent({
      event: "item.update_failed",
      status: "failure",
      errorClass: error.code,
      userId: user.id,
      entityId: parsed.data.id,
    });
    return mapItemError(error);
  }

  revalidateLibrary();
  return ok(null);
}

/** Deletes only an owned item; its tag rows cascade through the FK. */
export async function deleteItem(
  _prevState: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const id = formData.get("id");
  const parsed = itemIdSchema.safeParse(id);
  if (!parsed.success) return fail("VALIDATION_FAILED", "Item inválido.");

  const user = await requireUser();
  const supabase = await createClient();

  // Best-effort: deleting an item must leave no object in the
  // `link-previews` bucket. Runs *before* the row
  // delete so cleanup always gets a chance even if the delete itself later
  // fails; a Storage failure here only logs, it must never block the
  // delete (deletePreviewObjects() is a no-op for prompt/code_component,
  // so calling it unconditionally needs no type check).
  try {
    await deletePreviewObjects(supabase, user.id, parsed.data);
  } catch (error) {
    logEvent({
      event: "preview.cleanup_failed",
      status: "failure",
      errorClass: error instanceof Error ? error.name : "UnknownError",
      entityId: parsed.data,
      userId: user.id,
    });
  }

  const { data, error } = await supabase
    .from("library_items")
    .delete()
    .eq("id", parsed.data)
    .select("id")
    .maybeSingle();

  if (error) {
    logEvent({
      event: "item.delete_failed",
      status: "failure",
      errorClass: error.code,
      userId: user.id,
      entityId: parsed.data,
    });
    return mapItemError(error);
  }
  if (!data) return fail("NOT_FOUND", "Item não encontrado.");

  revalidateLibrary();
  return ok(null);
}
