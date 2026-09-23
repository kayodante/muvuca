"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { drainPreviewQueue } from "@/lib/previews/drain";
import { requireUser } from "@/lib/auth/require-user";
import {
  getLibraryItemById,
  type LibraryItem,
} from "@/lib/database/queries/items";
import type { Database } from "@/lib/database/generated.types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getDictionary } from "@/lib/i18n/server";
import { translateFieldErrors } from "@/lib/i18n/validation";
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
  const rawLanguage = formData.get("language");
  return {
    id: formData.get("id"),
    type: formData.get("type"),
    title: formData.get("title"),
    url: typeof rawUrl === "string" && rawUrl.trim() === "" ? null : rawUrl,
    content: formData.get("content"),
    description: formData.get("description"),
    tagIds: formData.getAll("tagIds"),
    // HTML selects sempre enviam string; um campo vazio significa
    // "sem linguagem" (mesma convenção de `url` acima). O valor bruto nunca
    // é confiável: só chega ao RPC o que o schema validar.
    language:
      typeof rawLanguage === "string" && rawLanguage.trim() === ""
        ? null
        : rawLanguage,
  };
}

function mapItemError(
  error: PostgrestErrorLike,
  t: Dictionary,
): ActionResult<never> {
  if (error.code === "P0001") {
    return fail("NOT_FOUND", t.errors.itemOrTagsUnavailable);
  }

  switch (mapPostgresErrorCode(error.code)) {
    case "DUPLICATE":
      return fail("DUPLICATE", t.errors.duplicateLink);
    case "CONSTRAINT_VIOLATION":
      return fail("CONSTRAINT_VIOLATION", t.errors.invalidItemData);
    case "INVALID_REFERENCE":
      return fail("INVALID_REFERENCE", t.errors.invalidTagReference);
    default:
      return fail("UNKNOWN", t.errors.operationFailed);
  }
}

function revalidateLibrary() {
  revalidatePath("/library", "layout");
  revalidatePath("/tags", "layout");
  revalidatePath("/t", "layout");
}

/** Reads a full prompt only after the user asks to view or edit it. */
export async function getItemDetails(
  id: string,
): Promise<ActionResult<LibraryItem>> {
  const t = await getDictionary();
  const parsed = itemIdSchema.safeParse(id);
  if (!parsed.success) return fail("VALIDATION_FAILED", t.errors.invalidItem);

  const user = await requireUser();
  try {
    const item = await getLibraryItemById(parsed.data);
    if (!item) return fail("NOT_FOUND", t.errors.itemNotFound);
    return ok(item);
  } catch (error) {
    logEvent({
      event: "item.detail_failed",
      status: "failure",
      errorClass: error instanceof Error ? error.name : "UnknownError",
      userId: user.id,
      entityId: parsed.data,
    });
    return fail("UNKNOWN", t.errors.itemLoadFailed);
  }
}

/** Creates an item and all selected tag relations in one database transaction. */
export async function createItem(
  _prevState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const t = await getDictionary();
  const parsed = createItemSchema.safeParse(itemFormData(formData));
  if (!parsed.success) {
    return fail(
      "VALIDATION_FAILED",
      t.errors.checkItemFields,
      translateFieldErrors(parsed.error.flatten().fieldErrors, t),
    );
  }

  const user = await requireUser();
  const supabase = await createClient();

  let normalizedUrl: string | null = null;
  if (parsed.data.type === "link") {
    normalizedUrl = normalizeHttpUrl(parsed.data.url);
    if (!normalizedUrl) {
      return fail("VALIDATION_FAILED", t.validation.validUrlRequired);
    }
  } else if (parsed.data.type === "code_component" && parsed.data.url) {
    normalizedUrl = normalizeHttpUrl(parsed.data.url);
    if (!normalizedUrl) {
      return fail("VALIDATION_FAILED", t.validation.validUrlRequired);
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
    // Só code_component porta linguagem; o valor vem exclusivamente do
    // schema validado (a constraint `library_items_language_allowed`
    // rejeitaria qualquer outra coisa).
    p_language:
      parsed.data.type === "code_component"
        ? (parsed.data.language ?? null)
        : null,
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
      ? mapItemError(error, t)
      : fail("UNKNOWN", t.errors.operationFailed);
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
  const t = await getDictionary();
  const parsed = updateItemSchema.safeParse(itemFormData(formData));
  if (!parsed.success) {
    return fail(
      "VALIDATION_FAILED",
      t.errors.checkItemFields,
      translateFieldErrors(parsed.error.flatten().fieldErrors, t),
    );
  }

  const user = await requireUser();
  const supabase = await createClient();

  let normalizedUrl: string | null = null;
  if (parsed.data.type === "link") {
    normalizedUrl = normalizeHttpUrl(parsed.data.url);
    if (!normalizedUrl) {
      return fail("VALIDATION_FAILED", t.validation.validUrlRequired);
    }
  } else if (parsed.data.type === "code_component" && parsed.data.url) {
    normalizedUrl = normalizeHttpUrl(parsed.data.url);
    if (!normalizedUrl) {
      return fail("VALIDATION_FAILED", t.validation.validUrlRequired);
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
    // update_library_item é full-row: p_language precisa ir sempre (o valor
    // validado para code_component, null nos demais) para não zerar — nem
    // inventar — a linguagem.
    p_language:
      parsed.data.type === "code_component"
        ? (parsed.data.language ?? null)
        : null,
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
    return mapItemError(error, t);
  }

  revalidateLibrary();
  return ok(null);
}

/** Deletes only an owned item; its tag rows cascade through the FK. */
export async function deleteItem(
  _prevState: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const t = await getDictionary();
  const id = formData.get("id");
  const parsed = itemIdSchema.safeParse(id);
  if (!parsed.success) return fail("VALIDATION_FAILED", t.errors.invalidItem);

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
    return mapItemError(error, t);
  }
  if (!data) return fail("NOT_FOUND", t.errors.itemNotFound);

  revalidateLibrary();
  return ok(null);
}
