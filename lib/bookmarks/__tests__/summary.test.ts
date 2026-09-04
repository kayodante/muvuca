import { describe, expect, it } from "vitest";

import { summarizeBookmarkDuplicates } from "@/lib/bookmarks/summary";
import type { BookmarkParseResult } from "@/lib/bookmarks/types";

function parseResult(
  items: BookmarkParseResult["items"],
  duplicateCount: number,
): BookmarkParseResult {
  return {
    tags: [],
    items,
    invalidCount: 0,
    duplicateCount,
    flattenedFolderCount: 0,
  };
}

describe("summarizeBookmarkDuplicates", () => {
  it("counts a URL already in the library only once, even when repeated in the file", () => {
    const item = {
      title: "Docs",
      url: "https://a.example/docs",
      normalizedUrl: "https://a.example/docs",
      tagKey: "tag_1",
    };

    const summary = summarizeBookmarkDuplicates(
      parseResult([item, { ...item, tagKey: "tag_2" }], 1),
      ["https://a.example/docs"],
    );

    expect(summary.alreadyInLibrary).toBe(1);
    expect(summary.repeatedInFile).toBe(1);
  });

  it("reports zero for both counters when the file is new to the library", () => {
    const summary = summarizeBookmarkDuplicates(
      parseResult(
        [
          {
            title: "Novo",
            url: "https://b.example/novo",
            normalizedUrl: "https://b.example/novo",
            tagKey: null,
          },
        ],
        0,
      ),
      [],
    );

    expect(summary.alreadyInLibrary).toBe(0);
    expect(summary.repeatedInFile).toBe(0);
  });

  it("ignores library URLs that are not present in the file", () => {
    const summary = summarizeBookmarkDuplicates(
      parseResult(
        [
          {
            title: "Novo",
            url: "https://b.example/novo",
            normalizedUrl: "https://b.example/novo",
            tagKey: null,
          },
        ],
        0,
      ),
      ["https://c.example/outro"],
    );

    expect(summary.alreadyInLibrary).toBe(0);
  });
});
