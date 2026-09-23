import { describe, expect, it } from "vitest";
import {
  buildTagPaths,
  getTagHref,
  resolveTagChain,
  tagPathSegmentsSchema,
  type SlugNode,
} from "@/lib/tags/routes";

function node(id: string, parentId: string | null, slug = id): SlugNode {
  return { id, parentId, slug };
}

// Design -> Recursos & Assets -> Ícones -> Animados; Design -> Referências;
// Dev -> Referências (mesmo slug em outro ramo).
const TREE: SlugNode[] = [
  node("design", null),
  node("recursos", "design", "recursos-assets"),
  node("icones", "recursos"),
  node("animados", "icones"),
  node("ref-design", "design", "referencias"),
  node("dev", null),
  node("ref-dev", "dev", "referencias"),
];

describe("getTagHref", () => {
  it("prefixes the slug path with /t", () => {
    expect(getTagHref({ path: "design/recursos-assets" })).toBe(
      "/t/design/recursos-assets",
    );
  });
});

describe("buildTagPaths", () => {
  it("derives every tag's path from parent_id + slug", () => {
    const paths = buildTagPaths(TREE);

    expect(paths.get("design")).toBe("design");
    expect(paths.get("recursos")).toBe("design/recursos-assets");
    expect(paths.get("animados")).toBe(
      "design/recursos-assets/icones/animados",
    );
    expect(paths.get("ref-design")).toBe("design/referencias");
    expect(paths.get("ref-dev")).toBe("dev/referencias");
  });

  it("does not depend on parents coming before children", () => {
    const paths = buildTagPaths([...TREE].reverse());

    expect(paths.get("animados")).toBe(
      "design/recursos-assets/icones/animados",
    );
  });

  it("omits a tag whose ancestor chain is incomplete instead of truncating it", () => {
    const paths = buildTagPaths([node("icones", "recursos")]);

    expect(paths.has("icones")).toBe(false);
  });

  it("terminates on a cycle", () => {
    const paths = buildTagPaths([node("a", "b"), node("b", "a")]);

    expect(paths.size).toBe(0);
  });
});

describe("resolveTagChain", () => {
  it("resolves a root", () => {
    expect(resolveTagChain(TREE, ["design"])?.map((t) => t.id)).toEqual([
      "design",
    ]);
  });

  it("resolves a deep path root-first", () => {
    expect(
      resolveTagChain(TREE, [
        "design",
        "recursos-assets",
        "icones",
        "animados",
      ])?.map((t) => t.id),
    ).toEqual(["design", "recursos", "icones", "animados"]);
  });

  it("uses the branch, not the slug alone, when a slug repeats", () => {
    expect(resolveTagChain(TREE, ["dev", "referencias"])?.at(-1)?.id).toBe(
      "ref-dev",
    );
  });

  it("returns null when an intermediate segment does not exist", () => {
    expect(resolveTagChain(TREE, ["design", "nope", "icones"])).toBeNull();
  });

  it("returns null when the last segment does not exist", () => {
    expect(resolveTagChain(TREE, ["design", "recursos-assets", "nope"])).toBe(
      null,
    );
  });

  it("returns null when a child slug is used as a root", () => {
    expect(resolveTagChain(TREE, ["icones"])).toBeNull();
  });
});

describe("tagPathSegmentsSchema", () => {
  it("accepts 1 to 6 well-formed slugs", () => {
    expect(tagPathSegmentsSchema.safeParse(["design"]).success).toBe(true);
    expect(
      tagPathSegmentsSchema.safeParse(["a", "b-2", "c", "d", "e", "f"]).success,
    ).toBe(true);
  });

  it.each([
    ["no segments", []],
    ["more than 6 levels", ["a", "b", "c", "d", "e", "f", "g"]],
    ["uppercase", ["Design"]],
    ["accent", ["ícones"]],
    ["double hyphen", ["a--b"]],
    ["leading hyphen", ["-a"]],
    ["dot segment", [".."]],
    ["encoded space", ["%20"]],
    ["underscore", ["a_b"]],
    ["too long", ["a".repeat(101)]],
  ])("rejects %s", (_label, segments) => {
    expect(tagPathSegmentsSchema.safeParse(segments).success).toBe(false);
  });
});
