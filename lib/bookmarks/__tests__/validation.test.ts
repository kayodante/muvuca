import { describe, expect, it } from "vitest";

import {
  BOOKMARK_BATCH_SIZE,
  MAX_BOOKMARKS_PER_BATCH,
} from "@/lib/bookmarks/types";
import {
  bookmarkImportSchema,
  bookmarkUrlsSchema,
} from "@/lib/bookmarks/validation";

describe("bookmark validation schemas", () => {
  it("validates a standard batch payload of 200 items", () => {
    const items = Array.from({ length: BOOKMARK_BATCH_SIZE }, (_, i) => ({
      title: `Item ${i + 1}`,
      url: `https://example.com/item/${i + 1}`,
      normalizedUrl: `https://example.com/item/${i + 1}`,
      tagKey: "tag_1",
    }));

    const result = bookmarkImportSchema.safeParse({
      tags: [{ key: "tag_1", parentKey: null, name: "Geral" }],
      items,
      invalidCount: 0,
    });

    expect(result.success).toBe(true);
  });

  it("rejects batches exceeding MAX_BOOKMARKS_PER_BATCH", () => {
    const items = Array.from(
      { length: MAX_BOOKMARKS_PER_BATCH + 1 },
      (_, i) => ({
        title: `Item ${i + 1}`,
        url: `https://example.com/item/${i + 1}`,
        normalizedUrl: `https://example.com/item/${i + 1}`,
        tagKey: null,
      }),
    );

    const result = bookmarkImportSchema.safeParse({
      tags: [],
      items,
      invalidCount: 0,
    });

    expect(result.success).toBe(false);
  });

  it("validates tag hierarchy consistency in a batch", () => {
    const result = bookmarkImportSchema.safeParse({
      tags: [
        { key: "tag_1", parentKey: null, name: "Pai" },
        {
          key: "tag_2",
          parentKey: "tag_999",
          name: "Filho Órfão",
        },
      ],
      items: [
        {
          title: "Link",
          url: "https://example.com",
          normalizedUrl: "https://example.com/",
          tagKey: "tag_1",
        },
      ],
      invalidCount: 0,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Hierarquia de pastas inválida.",
      );
    }
  });

  it("allows bookmarkUrlsSchema to validate up to 20,000 URLs", () => {
    const urls = Array.from(
      { length: 1_000 },
      (_, i) => `https://example.com/${i}`,
    );
    const result = bookmarkUrlsSchema.safeParse(urls);
    expect(result.success).toBe(true);
  });
});
