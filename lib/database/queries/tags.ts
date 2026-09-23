import { createClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/security/logging";
import type { FlatTag } from "@/lib/tags/tree";
import { buildTagPaths, resolveTagChain } from "@/lib/tags/routes";

export type Tag = FlatTag & {
  createdAt: string;
  updatedAt: string;
};

/** A breadcrumb entry: enough to render and link one ancestor. */
export type TagAncestor = Pick<Tag, "id" | "name" | "path">;

const TAG_COLUMNS =
  "id, parent_id, name, slug, description, color_token, created_at, updated_at";

type TagRow = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  color_token: string;
  created_at: string;
  updated_at: string;
};

/**
 * Rows -> `Tag`s with their slug path. `rows` must hold every ancestor of
 * the tags that need a path (the whole list, or `tags_with_ancestors`'
 * output). A tag whose chain is incomplete gets no path and is dropped,
 * logged: FK + RLS make that unreachable for the caller's own tags, and a
 * `Tag` without a working link would be worse than a missing chip.
 */
function toTags(rows: TagRow[]): Tag[] {
  const paths = buildTagPaths(
    rows.map((row) => ({
      id: row.id,
      parentId: row.parent_id,
      slug: row.slug,
    })),
  );

  return rows.flatMap((row) => {
    const path = paths.get(row.id);

    if (!path) {
      logEvent({
        event: "tags.path_unresolved",
        status: "failure",
        entityId: row.id,
      });
      return [];
    }

    return [
      {
        id: row.id,
        parentId: row.parent_id,
        name: row.name,
        description: row.description,
        colorToken: row.color_token,
        path,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    ];
  });
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
    .select(TAG_COLUMNS)
    .order("name_normalized", { ascending: true });

  if (error) {
    logEvent({
      event: "tags.list_failed",
      status: "failure",
      errorClass: error.code ?? error.name,
    });
    throw error;
  }

  return toTags(data ?? []);
}

/**
 * Tags by id, deduplicated -- used to resolve only the tags a page of items
 * actually references, instead of the caller's whole tag list (AAA-78).
 * `tags_with_ancestors` (0031) also returns each tag's ancestor chain in the
 * same round-trip, which is what its slug path is built from; only the
 * requested tags are returned. RLS scopes this to the caller automatically
 * (0007_rls.sql); no explicit `user_id` filter is needed or added, matching
 * every other query in this codebase.
 */
export async function getTagsByIds(tagIds: string[]): Promise<Tag[]> {
  if (tagIds.length === 0) return [];

  const ids = [...new Set(tagIds)];
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("tags_with_ancestors", { p_tag_ids: ids })
    // On an RPC, PostgREST orders the projected rows, so the sort column
    // must be selected too -- unlike `from("tags")` in getTagList.
    .select(`${TAG_COLUMNS}, name_normalized`)
    .order("name_normalized", { ascending: true });

  if (error) {
    logEvent({
      event: "tags.list_by_ids_failed",
      status: "failure",
      errorClass: error.code ?? error.name,
    });
    throw error;
  }

  const requested = new Set(ids);
  return toTags(data ?? []).filter((tag) => requested.has(tag.id));
}

/**
 * Resolves a `/t/...` slug path to its tag plus the ancestors above it,
 * root-first, or `null` when any level does not exist for the caller.
 * `segments` must already be validated by `tagPathSegmentsSchema`.
 *
 * One query: every caller-owned tag whose slug appears anywhere in the path
 * (RLS-scoped, covered by `tags_unique_slug_per_parent`), then a walk down
 * `parent_id` in memory -- never a lookup by the last slug alone, since the
 * same slug can live under different parents. The chain doubles as the
 * breadcrumb, so no ancestor query follows.
 */
export async function getTagByPath(
  segments: string[],
): Promise<{ tag: Tag; ancestors: TagAncestor[] } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .select(TAG_COLUMNS)
    .in("slug", [...new Set(segments)]);

  if (error) {
    logEvent({
      event: "tags.resolve_path_failed",
      status: "failure",
      errorClass: error.code ?? error.name,
    });
    throw error;
  }

  const rows = data ?? [];
  const chain = resolveTagChain(
    rows.map((row) => ({ ...row, parentId: row.parent_id })),
    segments,
  );
  if (!chain) return null;

  const tags = toTags(chain);
  const tag = tags.at(-1);
  if (!tag || tags.length !== chain.length) return null;

  return {
    tag,
    ancestors: tags
      .slice(0, -1)
      .map(({ id, name, path }) => ({ id, name, path })),
  };
}

/**
 * Number of direct children of a tag, without fetching the whole tree.
 * Covered by the `tags_user_id_parent_id_idx` index (migration 0006). RLS
 * scopes this to the caller automatically (0007_rls.sql); no explicit
 * `user_id` filter is needed or added, matching every other query in this
 * codebase.
 */
export async function getChildTagCount(tagId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("tags")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", tagId);

  if (error) {
    throw error;
  }

  return count ?? 0;
}
