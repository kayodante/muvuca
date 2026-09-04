"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import {
  createTagSchema,
  deleteTagSchema,
  updateTagSchema,
} from "@/lib/validation/tag";
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
 * Maps a tag-mutation failure to a stable, user-facing result. `P0001` is
 * Postgres's default SQLSTATE for a bare `raise exception` -- the hierarchy
 * trigger (0008_tag_hierarchy.sql) and `delete_tag_reparent_children`
 * (0009_tag_rpc.sql) only ever raise plain, product-authored Portuguese
 * sentences that way, so surfacing that message directly is safe: it is
 * source-controlled application text, not an internal Postgres detail.
 */
function mapTagError(error: PostgrestErrorLike): ActionResult<never> {
  if (error.code === "P0001") {
    return fail("CONSTRAINT_VIOLATION", error.message);
  }

  const code = mapPostgresErrorCode(error.code);

  switch (code) {
    case "DUPLICATE":
      return fail("DUPLICATE", "Já existe uma tag com esse nome nesse nível.", {
        name: ["Esse nome já está em uso nesse nível da hierarquia."],
      });
    case "INVALID_REFERENCE":
      return fail("INVALID_REFERENCE", "Tag pai inválida.");
    case "CONSTRAINT_VIOLATION":
      return fail("CONSTRAINT_VIOLATION", "Dados da tag inválidos.");
    case "NOT_FOUND":
      return fail("NOT_FOUND", "Tag não encontrada.");
    default:
      return fail("UNKNOWN", "Não foi possível concluir a operação.");
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

/** Creates a tag, optionally as a child of `parentId`. */
export async function createTag(
  _prevState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createTagSchema.safeParse(parseTagFormData(formData));

  if (!parsed.success) {
    return fail(
      "VALIDATION_FAILED",
      "Verifique os campos da tag.",
      parsed.error.flatten().fieldErrors,
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
    return mapTagError(error);
  }

  revalidatePath("/tags", "layout");
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
  const parsed = updateTagSchema.safeParse(parseTagFormData(formData));

  if (!parsed.success) {
    return fail(
      "VALIDATION_FAILED",
      "Verifique os campos da tag.",
      parsed.error.flatten().fieldErrors,
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
    return mapTagError(error);
  }

  if (!data) {
    return fail("NOT_FOUND", "Tag não encontrada.");
  }

  revalidatePath("/tags", "layout");
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
  const parsed = deleteTagSchema.safeParse({ id: formData.get("id") });

  if (!parsed.success) {
    return fail("VALIDATION_FAILED", "Tag inválida.");
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

    if (error.code === "P0001") {
      return fail("NOT_FOUND", "Tag não encontrada.");
    }

    return mapTagError(error);
  }

  revalidatePath("/tags", "layout");
  return ok(null);
}
