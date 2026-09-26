/**
 * Pure tree helpers shared by TagColumns (rendering), TagForm (parent picker)
 * and the bulk panel. No I/O, no Supabase types -- operate on the flat tag
 * list the page already fetched once.
 */

import { TAG_MAX_DEPTH } from "@/lib/tags/routes";

export type FlatTag = {
  id: string;
  parentId: string | null;
  name: string;
  colorToken: string;
  description: string | null;
  /**
   * Slug path root-first ("design/recursos-assets"), derived on read from
   * parent_id + slug -- never stored. Turn it into a link with `getTagHref`
   * (`lib/tags/routes.ts`); every operation still goes by `id`.
   */
  path: string;
};

export type TagNode = FlatTag & { children: TagNode[] };

/**
 * Assembles a flat list into a forest of root nodes. Sibling order follows
 * the input list's order (callers pass an already name-sorted list from the
 * database query); this function does no sorting of its own so there is
 * exactly one place that decides tag order.
 */
export function buildTagTree(flat: FlatTag[]): TagNode[] {
  const byId = new Map<string, TagNode>();

  for (const tag of flat) {
    byId.set(tag.id, { ...tag, children: [] });
  }

  const roots: TagNode[] = [];

  for (const tag of flat) {
    const node = byId.get(tag.id)!;
    const parent = tag.parentId ? byId.get(tag.parentId) : undefined;

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * All descendant ids of `tagId`, computed from the flat list. Used to
 * disable the tag itself and its whole subtree in the parent picker --
 * the database trigger is the enforcement of record, this is only the
 * client-side UX guard.
 */
export function getDescendantIds(tagId: string, flat: FlatTag[]): Set<string> {
  const childrenByParent = new Map<string, string[]>();

  for (const tag of flat) {
    if (tag.parentId) {
      const siblings = childrenByParent.get(tag.parentId);
      if (siblings) {
        siblings.push(tag.id);
      } else {
        childrenByParent.set(tag.parentId, [tag.id]);
      }
    }
  }

  const result = new Set<string>();
  const stack = [...(childrenByParent.get(tagId) ?? [])];

  while (stack.length > 0) {
    const id = stack.pop()!;
    // Defensive against malformed/cyclic input; the trigger never allows a
    // real cycle to be persisted, but this keeps the helper total either way.
    if (result.has(id)) continue;
    result.add(id);
    stack.push(...(childrenByParent.get(id) ?? []));
  }

  return result;
}

/** Depth-first search for a node by id within an already-built forest. */
export function findTagNode(nodes: TagNode[], id: string): TagNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findTagNode(node.children, id);
    if (found) return found;
  }
  return null;
}

export type TagWithDepth = FlatTag & { depth: number };

/**
 * Depth-first flattening of an already-built tree, each tag annotated with
 * its depth (root = 0). Used to render an indented, ordered option list in
 * the parent picker.
 */
export function flattenTreeWithDepth(
  nodes: TagNode[],
  depth = 0,
): TagWithDepth[] {
  const result: TagWithDepth[] = [];

  for (const node of nodes) {
    const { children, ...tag } = node;
    result.push({ ...tag, depth });
    result.push(...flattenTreeWithDepth(children, depth + 1));
  }

  return result;
}

/**
 * Client-side name filter over an already-built tree (D-05, no server
 * round-trip). A node survives if its own name matches or any descendant's
 * does, so a match deep in the tree keeps its ancestor path visible.
 */
export function filterTagTree(nodes: TagNode[], query: string): TagNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;

  const filterNode = (node: TagNode): TagNode | null => {
    const children = node.children
      .map(filterNode)
      .filter((child): child is TagNode => child !== null);
    const selfMatches = node.name.toLowerCase().includes(q);

    if (!selfMatches && children.length === 0) {
      return null;
    }

    return { ...node, children };
  };

  return nodes.map(filterNode).filter((node): node is TagNode => node !== null);
}

/** Depth of every tag in the flat list, root = 1. */
function getDepths(flat: FlatTag[]): Map<string, number> {
  const byId = new Map(flat.map((tag) => [tag.id, tag]));
  const depths = new Map<string, number>();

  const depthOf = (tag: FlatTag, hops: number): number => {
    const known = depths.get(tag.id);
    if (known !== undefined) return known;
    const parent = tag.parentId ? byId.get(tag.parentId) : undefined;
    // `hops` bound: malformed/cyclic input must not recurse forever.
    const depth =
      parent && hops < flat.length ? depthOf(parent, hops + 1) + 1 : 1;
    depths.set(tag.id, depth);
    return depth;
  };

  for (const tag of flat) depthOf(tag, 0);
  return depths;
}

export type TagColumn = { owner: FlatTag | null; tags: FlatTag[] };

/**
 * The `/tags` column browser: the roots, then the children of every tag on
 * the path down to `browseId` that has any. `path` holds that path's ids
 * (empty when `browseId` is null or gone); `childCounts` the number of
 * direct children per tag. Same orphan rule as `buildTagTree`: a tag whose
 * parent is missing sits with the roots.
 */
export function getTagColumns(
  flat: FlatTag[],
  browseId: string | null,
): {
  columns: TagColumn[];
  path: Set<string>;
  childCounts: Map<string, number>;
} {
  const byId = new Map(flat.map((tag) => [tag.id, tag]));
  const childrenOf = new Map<string | null, FlatTag[]>();

  for (const tag of flat) {
    const key = tag.parentId && byId.has(tag.parentId) ? tag.parentId : null;
    const siblings = childrenOf.get(key);
    if (siblings) siblings.push(tag);
    else childrenOf.set(key, [tag]);
  }

  const chain: FlatTag[] = [];
  let current = browseId ? byId.get(browseId) : undefined;
  // `length` bound: malformed/cyclic input must not loop forever.
  while (current && chain.length < flat.length) {
    chain.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  const columns: TagColumn[] = [
    { owner: null, tags: childrenOf.get(null) ?? [] },
  ];
  for (const tag of chain) {
    const children = childrenOf.get(tag.id);
    if (children) columns.push({ owner: tag, tags: children });
  }

  const childCounts = new Map<string, number>();
  for (const [parentId, children] of childrenOf) {
    if (parentId) childCounts.set(parentId, children.length);
  }

  return { columns, path: new Set(chain.map((tag) => tag.id)), childCounts };
}

/**
 * Display names root-first ("Design", "Recursos"), for showing where a tag
 * lives when its slug path would be less readable.
 */
export function getNamePath(
  tag: FlatTag,
  byId: ReadonlyMap<string, FlatTag>,
): string[] {
  const names: string[] = [];
  let current: FlatTag | undefined = tag;
  while (current && names.length <= TAG_MAX_DEPTH) {
    names.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return names;
}

export type TagSummary = {
  total: number;
  roots: number;
  levels: number;
  withoutDescription: FlatTag[];
  /** Tags sharing a name in different branches, one group per name. */
  repeatedNames: FlatTag[][];
};

/**
 * What the `/tags` inspector shows while nothing is selected: the shape of
 * the hierarchy and the tags worth a curation pass. Names compare like the
 * `name_normalized` column (lower(btrim(name))).
 */
export function summarizeTags(flat: FlatTag[]): TagSummary {
  const depths = getDepths(flat);
  const byName = new Map<string, FlatTag[]>();

  for (const tag of flat) {
    const key = tag.name.trim().toLowerCase();
    const group = byName.get(key);
    if (group) group.push(tag);
    else byName.set(key, [tag]);
  }

  return {
    total: flat.length,
    roots: [...depths.values()].filter((depth) => depth === 1).length,
    levels: Math.max(0, ...depths.values()),
    withoutDescription: flat.filter((tag) => !tag.description?.trim()),
    repeatedNames: [...byName.values()].filter((group) => group.length > 1),
  };
}

/**
 * Drops every id whose ancestor is also selected: moving the ancestor
 * already carries it. Mirrors `move_tags` (0032), which stays the
 * authority. Input order is kept.
 */
export function normalizeMoveSelection(
  ids: readonly string[],
  flat: FlatTag[],
): string[] {
  const selected = new Set(ids);
  const parentOf = new Map(flat.map((tag) => [tag.id, tag.parentId]));

  return ids.filter((id) => {
    let current = parentOf.get(id) ?? null;
    for (let hops = 0; current !== null && hops < flat.length; hops += 1) {
      if (selected.has(current)) return false;
      current = parentOf.get(current) ?? null;
    }
    return true;
  });
}

/**
 * Tags that cannot receive `ids` as children: the selection itself, its
 * descendants (a cycle) and every tag deep enough that the tallest moved
 * subtree would pass TAG_MAX_DEPTH. UX guard only -- the hierarchy trigger
 * (0008) enforces it.
 */
export function getInvalidMoveTargets(
  ids: readonly string[],
  flat: FlatTag[],
): Set<string> {
  const invalid = new Set<string>();
  const depths = getDepths(flat);
  let tallest = 0;

  for (const id of normalizeMoveSelection(ids, flat)) {
    invalid.add(id);
    const ownDepth = depths.get(id) ?? 1;
    let height = 1;
    for (const descendantId of getDescendantIds(id, flat)) {
      invalid.add(descendantId);
      height = Math.max(
        height,
        (depths.get(descendantId) ?? ownDepth) - ownDepth + 1,
      );
    }
    tallest = Math.max(tallest, height);
  }

  for (const tag of flat) {
    if ((depths.get(tag.id) ?? 1) + tallest > TAG_MAX_DEPTH)
      invalid.add(tag.id);
  }

  return invalid;
}

/**
 * Moved tags whose name would collide at `parentId` -- with a tag that
 * stays there, or with another moved tag. Same comparison as the
 * `name_normalized` column (lower(btrim(name))); the per-level unique
 * indexes stay the authority.
 */
export function findMoveNameCollisions(
  ids: readonly string[],
  parentId: string | null,
  flat: FlatTag[],
): FlatTag[] {
  const moving = normalizeMoveSelection(ids, flat);
  const movingSet = new Set(moving);
  const byId = new Map(flat.map((tag) => [tag.id, tag]));
  const key = (name: string) => name.trim().toLowerCase();

  const taken = new Set(
    flat
      .filter((tag) => tag.parentId === parentId && !movingSet.has(tag.id))
      .map((tag) => key(tag.name)),
  );

  const collisions: FlatTag[] = [];
  for (const id of moving) {
    const tag = byId.get(id);
    if (!tag) continue;
    if (taken.has(key(tag.name))) {
      collisions.push(tag);
    } else {
      taken.add(key(tag.name));
    }
  }
  return collisions;
}
