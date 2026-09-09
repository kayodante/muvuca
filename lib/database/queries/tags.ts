import { createClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/security/logging";
import type { FlatTag } from "@/lib/tags/tree";

export type Tag = FlatTag & {
  createdAt: string;
  updatedAt: string;
};

export type TagAncestor = {
  id: string;
  name: string;
  depth: number;
};

function toTag(row: {
  id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  color_token: string;
  created_at: string;
  updated_at: string;
}): Tag {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    description: row.description,
    colorToken: row.color_token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Every tag owned by the current user, name-sorted. RLS scopes this to the
 * caller automatically (0007_rls.sql); no explicit `user_id` filter is
 * needed or added, matching every other query in this codebase.
 */
export async function getTagList(): Promise<Tag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .select(
      "id, parent_id, name, description, color_token, created_at, updated_at",
    )
    .order("name_normalized", { ascending: true });

  if (error) {
    logEvent({
      event: "tags.list_failed",
      status: "failure",
      errorClass: error.code ?? error.name,
    });
    throw error;
  }

  return (data ?? []).map(toTag);
}

/**
 * Tags by id, deduplicated -- used to resolve only the tags a page of items
 * actually references, instead of the caller's whole tag list. RLS scopes
 * this to the caller automatically (0007_rls.sql); no explicit `user_id`
 * filter is needed or added, matching every other query in this codebase.
 */
export async function getTagsByIds(tagIds: string[]): Promise<Tag[]> {
  if (tagIds.length === 0) return [];

  const ids = [...new Set(tagIds)];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .select(
      "id, parent_id, name, description, color_token, created_at, updated_at",
    )
    .in("id", ids)
    .order("name_normalized", { ascending: true });

  if (error) {
    logEvent({
      event: "tags.list_by_ids_failed",
      status: "failure",
      errorClass: error.code ?? error.name,
    });
    throw error;
  }

  return (data ?? []).map(toTag);
}

/** A single tag by id, or `null` if it doesn't exist or isn't owned by the caller (RLS). */
export async function getTagById(tagId: string): Promise<Tag | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .select(
      "id, parent_id, name, description, color_token, created_at, updated_at",
    )
    .eq("id", tagId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toTag(data) : null;
}

/** Root-to-parent ancestor chain of a tag, via `tag_ancestors`. */
export async function getTagAncestors(tagId: string): Promise<TagAncestor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("tag_ancestors", {
    p_tag_id: tagId,
  });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => ({ id: row.id, name: row.name, depth: row.depth }))
    .sort((a, b) => b.depth - a.depth);
}
