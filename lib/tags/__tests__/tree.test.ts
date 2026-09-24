import { describe, expect, it } from "vitest";
import {
  buildTagTree,
  filterTagTree,
  findMoveNameCollisions,
  findTagNode,
  flattenTreeWithDepth,
  getDescendantIds,
  getInvalidMoveTargets,
  normalizeMoveSelection,
  type FlatTag,
} from "@/lib/tags/tree";

function tag(id: string, parentId: string | null, name = id): FlatTag {
  return {
    id,
    parentId,
    name,
    colorToken: "lime",
    description: null,
    path: id,
  };
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

// Chain of `length` tags c1 -> c2 -> ... (c1 is root).
function chain(length: number): FlatTag[] {
  return Array.from({ length }, (_, index) =>
    tag(`c${index + 1}`, index === 0 ? null : `c${index}`, `C${index + 1}`),
  );
}

describe("normalizeMoveSelection", () => {
  it("drops a selected tag whose ancestor is also selected", () => {
    expect(normalizeMoveSelection(["figma", "skills"], SKILLS_TREE)).toEqual([
      "skills",
    ]);
  });

  it("keeps unrelated tags in input order", () => {
    expect(normalizeMoveSelection(["figma", "dev"], SKILLS_TREE)).toEqual([
      "figma",
      "dev",
    ]);
  });
});

describe("getInvalidMoveTargets", () => {
  it("blocks the selection and its descendants", () => {
    const invalid = getInvalidMoveTargets(["design"], SKILLS_TREE);
    expect(invalid.has("design")).toBe(true);
    expect(invalid.has("figma")).toBe(true);
    expect(invalid.has("dev")).toBe(false);
    expect(invalid.has("skills")).toBe(false);
  });

  it("blocks targets where the tallest moved subtree would pass depth 6", () => {
    // Moving `skills` (height 3) needs a target at depth <= 3.
    const flat = [...SKILLS_TREE, ...chain(5)];
    const invalid = getInvalidMoveTargets(["skills"], flat);
    expect(invalid.has("c3")).toBe(false);
    expect(invalid.has("c4")).toBe(true);
    expect(invalid.has("c5")).toBe(true);
  });
});

describe("findMoveNameCollisions", () => {
  it("reports a moved tag whose name exists at the destination", () => {
    const flat = [
      ...SKILLS_TREE,
      tag("other", null, "Other"),
      tag("dup", "other", " design "),
    ];
    expect(
      findMoveNameCollisions(["dup"], "skills", flat).map((t) => t.id),
    ).toEqual(["dup"]);
  });

  it("reports a collision between two moved tags", () => {
    const flat = [
      tag("p1", null, "P1"),
      tag("p2", null, "P2"),
      tag("a", "p1", "Mid"),
      tag("b", "p2", "mid"),
    ];
    expect(
      findMoveNameCollisions(["a", "b"], null, flat).map((t) => t.id),
    ).toEqual(["b"]);
  });

  it("ignores a tag that already lives at the destination", () => {
    expect(findMoveNameCollisions(["dev"], "skills", SKILLS_TREE)).toEqual([]);
  });
});
