import { z } from "zod";

/**
 * Friendly tag URLs (`/t/design/recursos-assets/icones`, AAA-96).
 *
 * UUID is the tag's identity; the slug is only its routing identity. The
 * database is the only author of slugs (`slugify_tag_name` + the
 * `tags_set_slug` trigger, 0031_tag_slugs.sql) -- this module never derives
 * one from a name. It validates slug paths coming from a URL, joins the
 * persisted per-tag slugs along `parent_id` into a path, and builds the
 * href. No path is ever stored: moving or renaming a tag changes its path
 * and its descendants' on the next read.
 */

export const TAG_ROUTE_PREFIX = "/t";

/** Mirrors the `tags_slug_format` check constraint. */
export const TAG_SLUG_MAX_LENGTH = 100;
const TAG_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Maximum tree depth, enforced by `enforce_tag_hierarchy` (0008). */
export const TAG_MAX_DEPTH = 6;

export const tagSlugSchema = z
  .string()
  .max(TAG_SLUG_MAX_LENGTH)
  .regex(TAG_SLUG_PATTERN);

/** A `/t/[...tagPath]` param: 1 to 6 well-formed slugs, root first. */
export const tagPathSegmentsSchema = z
  .array(tagSlugSchema)
  .min(1)
  .max(TAG_MAX_DEPTH);

export type SlugNode = { id: string; parentId: string | null; slug: string };

export function getTagHref(tag: { path: string }): string {
  return `${TAG_ROUTE_PREFIX}/${tag.path}`;
}

/**
 * Slug path ("design/recursos-assets") of every tag whose whole ancestor
 * chain is present in `tags`. A tag with a missing ancestor is left out
 * rather than given a truncated path -- a wrong link is worse than none.
 */
export function buildTagPaths(tags: SlugNode[]): Map<string, string> {
  const byId = new Map(tags.map((tag) => [tag.id, tag]));
  const paths = new Map<string, string>();

  const pathOf = (tag: SlugNode, level: number): string | null => {
    const known = paths.get(tag.id);
    if (known) return known;
    // Defensive: the hierarchy trigger never persists a cycle or a 7th
    // level, but malformed input must not recurse forever.
    if (level > TAG_MAX_DEPTH) return null;

    let path: string | null = tag.slug;
    if (tag.parentId !== null) {
      const parent = byId.get(tag.parentId);
      const parentPath = parent ? pathOf(parent, level + 1) : null;
      path = parentPath ? `${parentPath}/${tag.slug}` : null;
    }

    if (path) paths.set(tag.id, path);
    return path;
  };

  for (const tag of tags) pathOf(tag, 1);

  return paths;
}

/**
 * Walks `segments` down the tree: the first must be a root, each next one a
 * child of the previous match. `candidates` only needs the tags whose slug
 * appears in `segments`. Returns the chain root-first, or `null` as soon as
 * one level is missing -- never a lookup by the last slug alone, since the
 * same slug can exist under different parents.
 */
export function resolveTagChain<T extends SlugNode>(
  candidates: T[],
  segments: string[],
): T[] | null {
  const chain: T[] = [];
  let parentId: string | null = null;

  for (const segment of segments) {
    const next = candidates.find(
      (tag) => tag.parentId === parentId && tag.slug === segment,
    );
    if (!next) return null;
    chain.push(next);
    parentId = next.id;
  }

  return chain;
}
