import { describe, expect, it } from "vitest";

import {
  chunkArray,
  createBookmarkBatches,
  getRequiredTagHierarchy,
} from "@/lib/bookmarks/batch";
import type {
  BookmarkItem,
  BookmarkParseResult,
  BookmarkTag,
} from "@/lib/bookmarks/types";

describe("bookmark batching utilities", () => {
  it("chunks generic arrays into sized groups", () => {
    const items = [1, 2, 3, 4, 5];
    expect(chunkArray(items, 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunkArray([], 2)).toEqual([]);
  });

  it("extracts required tag hierarchy maintaining parent-before-child order", () => {
    const tags: BookmarkTag[] = [
      { key: "tag_1", parentKey: null, name: "Root" },
      { key: "tag_2", parentKey: "tag_1", name: "Child A" },
      {
        key: "tag_3",
        parentKey: "tag_2",
        name: "Grandchild A",
      },
      { key: "tag_4", parentKey: null, name: "Unrelated" },
    ];

    const result = getRequiredTagHierarchy(tags, new Set(["tag_3"]));
    expect(result.map((t) => t.key)).toEqual(["tag_1", "tag_2", "tag_3"]);
  });

  it("splits a large bookmark parse result into sequential batches with tag hierarchy", () => {
    const tags: BookmarkTag[] = [
      { key: "tag_1", parentKey: null, name: "Root" },
      { key: "tag_2", parentKey: "tag_1", name: "Child A" },
      { key: "tag_3", parentKey: null, name: "Child B" },
    ];
    const items: BookmarkItem[] = [
      {
        title: "Item 1",
        url: "https://a.com",
        normalizedUrl: "https://a.com/",
        tagKey: "tag_2",
      },
      {
        title: "Item 2",
        url: "https://b.com",
        normalizedUrl: "https://b.com/",
        tagKey: "tag_3",
      },
      {
        title: "Item 3",
        url: "https://c.com",
        normalizedUrl: "https://c.com/",
        tagKey: null,
      },
    ];
    const parseResult: BookmarkParseResult = {
      tags,
      items,
      invalidCount: 5,
      duplicateCount: 1,
      flattenedFolderCount: 0,
    };

    const batches = createBookmarkBatches(parseResult, 2);

    expect(batches).toHaveLength(2);
    // Batch 1: 2 items, includes all folders in first batch so empty/future folders exist
    expect(batches[0]?.items).toHaveLength(2);
    expect(batches[0]?.tags.map((t) => t.key)).toEqual([
      "tag_1",
      "tag_2",
      "tag_3",
    ]);
    expect(batches[0]?.invalidCount).toBe(5);

    // Batch 2: 1 item without tags
    expect(batches[1]?.items).toHaveLength(1);
    expect(batches[1]?.invalidCount).toBe(0);
  });

  it("returns an empty array when items are empty", () => {
    const parseResult: BookmarkParseResult = {
      tags: [],
      items: [],
      invalidCount: 0,
      duplicateCount: 0,
      flattenedFolderCount: 0,
    };
    expect(createBookmarkBatches(parseResult, 200)).toEqual([]);
  });
});
