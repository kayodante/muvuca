import { describe, expect, it } from "vitest";
import {
  buildTagTree,
  filterTagTree,
  findTagNode,
  flattenTreeWithDepth,
  getDescendantIds,
  type FlatTag,
} from "@/lib/tags/tree";

function tag(id: string, parentId: string | null, name = id): FlatTag {
  return { id, parentId, name, colorToken: "lime", description: null };
}

// Skills -> Design, Dev; Design -> Figma
const SKILLS_TREE: FlatTag[] = [
  tag("skills", null, "Skills"),
  tag("design", "skills", "Design"),
  tag("dev", "skills", "Dev"),
  tag("figma", "design", "Figma"),
];

describe("buildTagTree", () => {
  it("nests children under their parent", () => {
    const tree = buildTagTree(SKILLS_TREE);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.id).toBe("skills");
    expect(tree[0]!.children.map((c) => c.id)).toEqual(["design", "dev"]);
    expect(tree[0]!.children[0]!.children.map((c) => c.id)).toEqual(["figma"]);
  });

  it("treats a tag whose parent isn't in the list as a root", () => {
    const tree = buildTagTree([tag("orphan", "missing-parent")]);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.id).toBe("orphan");
  });

  it("returns an empty forest for an empty list", () => {
    expect(buildTagTree([])).toEqual([]);
  });

  it("preserves input order among siblings", () => {
    const tree = buildTagTree([tag("b", null), tag("a", null)]);
    expect(tree.map((n) => n.id)).toEqual(["b", "a"]);
  });
});

describe("getDescendantIds", () => {
  it("returns every descendant across multiple levels", () => {
    const ids = getDescendantIds("skills", SKILLS_TREE);
    expect(ids).toEqual(new Set(["design", "dev", "figma"]));
  });

  it("returns an empty set for a leaf", () => {
    expect(getDescendantIds("figma", SKILLS_TREE)).toEqual(new Set());
  });

  it("does not include the tag itself", () => {
    expect(getDescendantIds("design", SKILLS_TREE).has("design")).toBe(false);
  });

  it("is total (does not loop forever) against a malformed cycle", () => {
    const cyclic: FlatTag[] = [tag("a", "b"), tag("b", "a")];
    expect(() => getDescendantIds("a", cyclic)).not.toThrow();
  });

  it("covers a hierarchy at the six-level product limit", () => {
    const deepTree = [
      tag("l1", null),
      tag("l2", "l1"),
      tag("l3", "l2"),
      tag("l4", "l3"),
      tag("l5", "l4"),
      tag("l6", "l5"),
    ];

    expect(getDescendantIds("l1", deepTree)).toEqual(
      new Set(["l2", "l3", "l4", "l5", "l6"]),
    );
  });
});

describe("findTagNode", () => {
  it("finds a nested node by id", () => {
    const tree = buildTagTree(SKILLS_TREE);
    expect(findTagNode(tree, "figma")?.name).toBe("Figma");
  });

  it("returns null for an unknown id", () => {
    const tree = buildTagTree(SKILLS_TREE);
    expect(findTagNode(tree, "unknown")).toBeNull();
  });
});

describe("flattenTreeWithDepth", () => {
  it("annotates each tag with its depth, root at 0", () => {
    const tree = buildTagTree(SKILLS_TREE);
    const flat = flattenTreeWithDepth(tree);
    expect(flat.map((t) => [t.id, t.depth])).toEqual([
      ["skills", 0],
      ["design", 1],
      ["figma", 2],
      ["dev", 1],
    ]);
  });
});

describe("filterTagTree", () => {
  it("returns the full tree unchanged for an empty query", () => {
    const tree = buildTagTree(SKILLS_TREE);
    expect(filterTagTree(tree, "")).toEqual(tree);
  });

  it("keeps an ancestor whose descendant matches, even if the ancestor itself doesn't", () => {
    const tree = buildTagTree(SKILLS_TREE);
    const filtered = filterTagTree(tree, "figma");
    expect(filtered.map((n) => n.id)).toEqual(["skills"]);
    expect(filtered[0]!.children.map((n) => n.id)).toEqual(["design"]);
    expect(filtered[0]!.children[0]!.children.map((n) => n.id)).toEqual([
      "figma",
    ]);
  });

  it("drops branches with no match at all", () => {
    const tree = buildTagTree(SKILLS_TREE);
    const filtered = filterTagTree(tree, "figma");
    // "Dev" has no match anywhere under it, so it's excluded.
    expect(filtered[0]!.children.find((n) => n.id === "dev")).toBeUndefined();
  });

  it("is case-insensitive", () => {
    const tree = buildTagTree(SKILLS_TREE);
    expect(filterTagTree(tree, "FIGMA")[0]!.children[0]!.children).toHaveLength(
      1,
    );
  });

  it("returns an empty forest when nothing matches", () => {
    const tree = buildTagTree(SKILLS_TREE);
    expect(filterTagTree(tree, "nonexistent")).toEqual([]);
  });
});
