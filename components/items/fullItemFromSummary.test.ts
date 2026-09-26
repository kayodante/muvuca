import { describe, expect, it } from "vitest";

import type { LibraryItemSummary } from "@/lib/database/queries/items";
import { fullItemFromSummary } from "./fullItemFromSummary";

const prompt: LibraryItemSummary = {
  id: "1",
  type: "prompt",
  title: "Prompt",
  description: null,
  url: null,
  contentPreview: "0123456789",
  tagIds: ["tag-1"],
};

describe("fullItemFromSummary", () => {
  it("uses a complete prompt preview without retaining contentPreview", () => {
    expect(fullItemFromSummary(prompt)).toEqual({
      id: "1",
      type: "prompt",
      title: "Prompt",
      description: null,
      url: null,
      content: "0123456789",
      tagIds: ["tag-1"],
    });
  });

  it("fetches a preview at the 2000 code point boundary", () => {
    expect(
      fullItemFromSummary({ ...prompt, contentPreview: "a".repeat(2000) }),
    ).toBeNull();
  });

  it("counts emoji as one code point", () => {
    const contentPreview = "😀".repeat(1999);
    expect(fullItemFromSummary({ ...prompt, contentPreview })).toMatchObject({
      content: contentPreview,
    });
  });

  it("fetches links", () => {
    expect(
      fullItemFromSummary({
        id: "2",
        type: "link",
        title: "Link",
        description: null,
        url: "https://example.com",
        tagIds: [],
        preview: null,
      }),
    ).toBeNull();
  });

  it("preserves a code component's source and language", () => {
    expect(
      fullItemFromSummary({
        id: "3",
        type: "code_component",
        title: "Code",
        description: null,
        url: "https://example.com/code",
        contentPreview: "const answer = 42;",
        language: "typescript",
        tagIds: [],
      }),
    ).toEqual({
      id: "3",
      type: "code_component",
      title: "Code",
      description: null,
      url: "https://example.com/code",
      content: "const answer = 42;",
      language: "typescript",
      tagIds: [],
    });
  });
});
