"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { getTagList, type Tag } from "@/lib/database/queries/tags";
import {
  createTagSchema,
  deleteTagSchema,
  deleteTagsSchema,
  moveTagsSchema,
  updateTagSchema,
} from "@/lib/validation/tag";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getDictionary } from "@/lib/i18n/server";
import { translateFieldErrors } from "@/lib/i18n/validation";
import { logEvent } from "@/lib/security/logging";
import {
  ok,
  fail,
  mapPostgresErrorCode,
  type ActionResult,
} from "@/lib/utils/result";

/** Shape of a Postgres error surfaced through supabase-js. */
type PostgrestErrorLike = { code?: string; message: string };

/**
 * `P0001` is Postgres's default SQLSTATE for a bare `raise exception` -- the
 * hierarchy trigger (0008_tag_hierarchy.sql) and
 * `delete_tag_reparent_children` (0009/0015_tag_rpc.sql) only ever raise one
 * of these fixed Portuguese sentences that way. Exact-matched here against a
 * translated key instead of surfacing `error.message` directly, so the raw
 * Postgres string (source-controlled today, but still an internal detail)
 * never reaches the client and the result is locale-correct. An unrecognized
 * P0001 sentence (a future migration, a typo) falls back to the generic
 * translated error rather than leaking untranslated text.
 */
const TAG_P0001_MESSAGES: Record<string, keyof Dictionary["errors"]> = {
  "a tag não pode ser pai de si mesma": "tagSelfParent",
  "esta alteração criaria um ciclo na hierarquia de tags": "tagCycle",
  "a hierarquia de tags excede a profundidade máxima de 6 níveis":
    "tagMaxDepth",
  "esta alteração excederia a profundidade máxima de 6 níveis para tags descendentes":
    "tagDescendantMaxDepth",
  "tag não encontrada": "tagNotFound",
  "lote de tags inválido": "tagBatchInvalid",
};

function translateTagP0001(message: string, t: Dictionary): string {
  const key = TAG_P0001_MESSAGES[message];
  return t.errors[key ?? "unknown"];
}

/** Maps a tag-mutation failure to a stable, user-facing result. */
function mapTagError(
  error: PostgrestErrorLike,
  t: Dictionary,
): ActionResult<never> {
  if (error.code === "P0001") {
    return fail("CONSTRAINT_VIOLATION", translateTagP0001(error.message, t));
  }

  const code = mapPostgresErrorCode(error.code);

  switch (code) {
    case "DUPLICATE":
      return fail("DUPLICATE", t.errors.duplicateTagName, {
        name: [t.errors.duplicateTagNameField],
      });
    case "INVALID_REFERENCE":
      return fail("INVALID_REFERENCE", t.errors.invalidParentTag);
    case "CONSTRAINT_VIOLATION":
      return fail("CONSTRAINT_VIOLATION", t.errors.invalidTagData);
    case "NOT_FOUND":
      return fail("NOT_FOUND", t.errors.tagNotFound);
    default:
      return fail("UNKNOWN", t.errors.operationFailed);
  }
}

function parseTagFormData(formData: FormData) {
  return {
    id: formData.get("id") ?? undefined,
    name: formData.get("name"),
    description: formData.get("description"),
    colorToken: formData.get("colorToken"),
    parentId: formData.get("parentId"),
  };
}

/** Reads the full tag tree only when the item editor's tag picker opens. */
export async function listTagsForSelect(): Promise<ActionResult<Tag[]>> {
  const t = await getDictionary();
  const user = await requireUser();
  try {
    const tags = await getTagList();
    return ok(tags);
  } catch (error) {
    logEvent({
      event: "tags.select_list_failed",
      status: "failure",
      errorClass: error instanceof Error ? error.name : "UnknownError",
      userId: user.id,
    });
    return fail("UNKNOWN", t.errors.tagsLoadFailed);
  }
}

/** Creates a tag, optionally as a child of `parentId`. */
export async function createTag(
  _prevState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const t = await getDictionary();
  const parsed = createTagSchema.safeParse(parseTagFormData(formData));

  if (!parsed.success) {
    return fail(
      "VALIDATION_FAILED",
      t.errors.checkTagFields,
      translateFieldErrors(parsed.error.flatten().fieldErrors, t),
    );
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tags")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      color_token: parsed.data.colorToken,
      parent_id: parsed.data.parentId,
    })
    .select("id")
    .single();

  if (error) {
    logEvent({
      event: "tag.create_failed",
      status: "failure",
      errorClass: error.code,
      userId: user.id,
    });
    return mapTagError(error, t);
  }

  revalidatePath("/tags", "layout");
  revalidatePath("/t", "layout");
  return ok({ id: data.id });
}

/**
 * Updates name, description, color and/or parent. RLS scopes
 * the `update` to the caller's own row; zero rows affected (wrong id, or
 * owned by someone else) is reported as `NOT_FOUND` rather than silently
 * succeeding.
 */
export async function updateTag(
  _prevState: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const t = await getDictionary();
  const parsed = updateTagSchema.safeParse(parseTagFormData(formData));

  if (!parsed.success) {
    return fail(
      "VALIDATION_FAILED",
      t.errors.checkTagFields,
      translateFieldErrors(parsed.error.flatten().fieldErrors, t),
    );
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tags")
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
      color_token: parsed.data.colorToken,
      parent_id: parsed.data.parentId,
    })
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();

  if (error) {
    logEvent({
      event: "tag.update_failed",
      status: "failure",
      errorClass: error.code,
      userId: user.id,
      entityId: parsed.data.id,
    });
    return mapTagError(error, t);
  }

  if (!data) {
    return fail("NOT_FOUND", t.errors.tagNotFound);
  }

  revalidatePath("/tags", "layout");
  revalidatePath("/t", "layout");
  return ok(null);
}

/**
 * Deletes a tag via `delete_tag_reparent_children`: direct children
 * are promoted to the deleted tag's own parent and item associations are
 * removed, all inside one transaction. Items are
 * never deleted.
 */
export async function deleteTag(
  _prevState: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const t = await getDictionary();
  const parsed = deleteTagSchema.safeParse({ id: formData.get("id") });

  if (!parsed.success) {
    return fail("VALIDATION_FAILED", t.errors.invalidTag);
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.rpc("delete_tag_reparent_children", {
    p_tag_id: parsed.data.id,
  });

  if (error) {
    logEvent({
      event: "tag.delete_failed",
      status: "failure",
      errorClass: error.code,
      userId: user.id,
      entityId: parsed.data.id,
    });

    // delete_tag_reparent_children only ever raises P0001 for one reason
    // (the tag itself wasn't found), so the code stays fixed at NOT_FOUND
    // while the message is still translated through the shared exact-match
    // table for consistency with mapTagError.
    if (error.code === "P0001") {
      return fail("NOT_FOUND", translateTagP0001(error.message, t));
    }

    return mapTagError(error, t);
  }

  revalidatePath("/tags", "layout");
  revalidatePath("/t", "layout");
  return ok(null);
}

/**
 * Moves every tag in `ids` under `parentId` (root when empty) via
 * `move_tags` (0032): one transaction, all or nothing. A selected tag whose
 * ancestor is also selected rides along -- the RPC drops it from the batch.
 */
export async function moveTags(
  _prevState: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const t = await getDictionary();
  const parsed = moveTagsSchema.safeParse({
    ids: formData.getAll("ids"),
    parentId: formData.get("parentId"),
  });

  if (!parsed.success) {
    return fail("VALIDATION_FAILED", t.errors.tagBatchInvalid);
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.rpc("move_tags", {
    p_tag_ids: parsed.data.ids,
    // Omitted = the RPC's `default null` = root.
    p_parent_id: parsed.data.parentId ?? undefined,
  });

  if (error) {
    logEvent({
      event: "tags.bulk_move_failed",
      status: "failure",
      errorClass: error.code,
      userId: user.id,
    });

    // A move never renames: a clash at the destination is the user's to fix.
    if (error.code === "23505") {
      return fail("DUPLICATE", t.errors.tagMoveNameCollision);
    }

    return mapTagError(error, t);
  }

  revalidatePath("/tags", "layout");
  revalidatePath("/t", "layout");
  return ok(null);
}

/**
 * Deletes every tag in `ids` via `delete_tags_reparent_children` (0032):
 * deepest first, in one transaction. Unselected children climb to the
 * nearest surviving ancestor; items are never deleted.
 */
export async function deleteTags(
  _prevState: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const t = await getDictionary();
  const parsed = deleteTagsSchema.safeParse({ ids: formData.getAll("ids") });

  if (!parsed.success) {
    return fail("VALIDATION_FAILED", t.errors.tagBatchInvalid);
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.rpc("delete_tags_reparent_children", {
    p_tag_ids: parsed.data.ids,
  });

  if (error) {
    logEvent({
      event: "tags.bulk_delete_failed",
      status: "failure",
      errorClass: error.code,
      userId: user.id,
    });

    if (error.code === "P0001" && error.message === "tag não encontrada") {
      return fail("NOT_FOUND", t.errors.tagNotFound);
    }

    return mapTagError(error, t);
  }

  revalidatePath("/tags", "layout");
  revalidatePath("/t", "layout");
  return ok(null);
}
