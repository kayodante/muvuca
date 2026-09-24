import { describe, expect, it } from "vitest";
import {
  createTagSchema,
  deleteTagsSchema,
  moveTagsSchema,
  TAG_BULK_MAX,
  tagColorSchema,
  tagDescriptionSchema,
  tagNameSchema,
  tagParentIdSchema,
  updateTagSchema,
} from "@/lib/validation/tag";

describe("tagNameSchema", () => {
  it("accepts a normal name", () => {
    expect(tagNameSchema.safeParse("Design").success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(tagNameSchema.safeParse("").success).toBe(false);
  });

  it("rejects a name over 80 chars", () => {
    expect(tagNameSchema.safeParse("a".repeat(81)).success).toBe(false);
  });

  it("trims whitespace before validating length", () => {
    const parsed = tagNameSchema.safeParse("  Design  ");
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toBe("Design");
  });
});

describe("tagDescriptionSchema", () => {
  it("normalizes an empty string to null", () => {
    const parsed = tagDescriptionSchema.safeParse("");
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toBeNull();
  });

  it("accepts null directly", () => {
    expect(tagDescriptionSchema.safeParse(null).success).toBe(true);
  });

  it("rejects a description over 500 chars", () => {
    expect(tagDescriptionSchema.safeParse("a".repeat(501)).success).toBe(false);
  });
});

describe("tagParentIdSchema", () => {
  it("normalizes an empty string to null (root tag)", () => {
    const parsed = tagParentIdSchema.safeParse("");
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toBeNull();
  });

  it("accepts a valid uuid", () => {
    expect(
      tagParentIdSchema.safeParse("11111111-1111-4111-8111-111111111111")
        .success,
    ).toBe(true);
  });

  it("rejects a non-uuid string", () => {
    expect(tagParentIdSchema.safeParse("not-a-uuid").success).toBe(false);
  });
});

describe("tagColorSchema", () => {
  it("accepts every token in the curated palette", () => {
    for (const token of [
      "lime",
      "emerald",
      "teal",
      "cyan",
      "blue",
      "violet",
      "purple",
      "pink",
      "red",
      "orange",
      "amber",
      "stone",
    ]) {
      expect(tagColorSchema.safeParse(token).success).toBe(true);
    }
  });

  it("rejects a color outside the palette", () => {
    expect(tagColorSchema.safeParse("magenta").success).toBe(false);
  });

  it("rejects arbitrary CSS as a color value", () => {
    expect(tagColorSchema.safeParse("javascript:alert(1)").success).toBe(false);
  });
});

describe("createTagSchema", () => {
  it("accepts a minimal root tag", () => {
    const parsed = createTagSchema.safeParse({
      name: "Skills",
      description: "",
      colorToken: "lime",
      parentId: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.description).toBeNull();
      expect(parsed.data.parentId).toBeNull();
    }
  });

  it("rejects a missing color token", () => {
    const parsed = createTagSchema.safeParse({
      name: "Skills",
      description: "",
      colorToken: "",
      parentId: "",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("updateTagSchema", () => {
  it("requires an id in addition to the create fields", () => {
    const parsed = updateTagSchema.safeParse({
      name: "Skills",
      description: "",
      colorToken: "lime",
      parentId: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a full update payload", () => {
    const parsed = updateTagSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Skills",
      description: "",
      colorToken: "lime",
      parentId: "",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("bulk tag schemas", () => {
  const id = "123e4567-e89b-12d3-a456-426614174000";

  it("accepts a root move with an empty parentId", () => {
    const parsed = moveTagsSchema.safeParse({ ids: [id], parentId: "" });
    expect(parsed.success && parsed.data.parentId).toBe(null);
  });

  it("rejects an empty batch and one over the cap", () => {
    expect(deleteTagsSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(
      deleteTagsSchema.safeParse({ ids: Array(TAG_BULK_MAX + 1).fill(id) })
        .success,
    ).toBe(false);
  });

  it("rejects a non-uuid id", () => {
    expect(deleteTagsSchema.safeParse({ ids: ["nope"] }).success).toBe(false);
  });
});
