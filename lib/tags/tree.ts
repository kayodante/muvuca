/**
 * Pure tree helpers shared by TagTree (rendering) and TagEditor (parent
 * picker). No I/O, no Supabase types -- operate on the flat tag list the
 * page already fetched once.
 */

export type FlatTag = {
  id: string;
  parentId: string | null;
  name: string;
  colorToken: string;
  description: string | null;
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
