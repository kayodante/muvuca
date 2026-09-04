import { describe, expect, it } from "vitest";

import {
  encodeSearchCursor,
  librarySearchParamsSchema,
  parseSearchCursor,
} from "@/lib/validation/search";

const id = "11111111-1111-4111-8111-111111111111";

describe("library search validation", () => {
  it("accepts only the MVP filters and sorts", () => {
    expect(
      librarySearchParamsSchema.safeParse({
        q: "  docs  ",
        tag: id,
        type: "link",
        sort: "title_asc",
      }).success,
    ).toBe(true);
    expect(librarySearchParamsSchema.safeParse({ type: "video" }).success).toBe(
      false,
    );
  });

  it("accepts the import=1 flag and rejects other values", () => {
    expect(librarySearchParamsSchema.safeParse({ import: "1" }).success).toBe(
      true,
    );
    expect(
      librarySearchParamsSchema.safeParse({ import: "true" }).success,
    ).toBe(false);
  });

  it("strips unknown query parameters silently without failing validation", () => {
    const result = librarySearchParamsSchema.safeParse({
      q: "  docs  ",
      tag: id,
      type: "link",
      sort: "title_asc",
      utm_source: "newsletter",
      utm_medium: "email",
      ref: "twitter",
      fbclid: "123456",
      unknown_param: "extra_value",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        q: "docs",
        tag: id,
        type: "link",
        sort: "title_asc",
      });
      expect(
        (result.data as Record<string, unknown>).utm_source,
      ).toBeUndefined();
      expect((result.data as Record<string, unknown>).ref).toBeUndefined();
      expect((result.data as Record<string, unknown>).fbclid).toBeUndefined();
    }
  });

  it("keeps valid cursors tied to their active sort", () => {
    const cursor = encodeSearchCursor({
      sort: "newest",
      timestamp: "2026-08-13T12:00:00.000Z",
      id,
    });

    expect(parseSearchCursor(cursor, "newest")).not.toBeNull();
    expect(parseSearchCursor(cursor, "oldest")).toBeNull();
    expect(parseSearchCursor("not-a-cursor", "newest")).toBeNull();
  });

  it("encodes and decodes cursor direction (next/prev)", () => {
    const nextCursor = encodeSearchCursor({
      sort: "newest",
      timestamp: "2026-08-13T12:00:00.000Z",
      id,
      dir: "next",
    });
    const prevCursor = encodeSearchCursor({
      sort: "newest",
      timestamp: "2026-08-13T12:00:00.000Z",
      id,
      dir: "prev",
    });

    const parsedNext = parseSearchCursor(nextCursor, "newest");
    const parsedPrev = parseSearchCursor(prevCursor, "newest");

    expect(parsedNext).toEqual({
      sort: "newest",
      timestamp: "2026-08-13T12:00:00.000Z",
      id,
      dir: "next",
    });
    expect(parsedPrev).toEqual({
      sort: "newest",
      timestamp: "2026-08-13T12:00:00.000Z",
      id,
      dir: "prev",
    });
  });

  it("supports direction parameter in searchCursorForItem", async () => {
    const { searchCursorForItem } = await import("@/lib/validation/search");
    const item = {
      id,
      title: "Alpha Document",
      createdAt: "2026-08-13T12:00:00.000Z",
      updatedAt: "2026-08-14T12:00:00.000Z",
    };

    const cursorPrev = searchCursorForItem(item, "newest", "prev");
    expect(parseSearchCursor(cursorPrev, "newest")?.dir).toBe("prev");

    const titlePrev = searchCursorForItem(item, "title_asc", "prev");
    expect(parseSearchCursor(titlePrev, "title_asc")?.dir).toBe("prev");

    const defaultNext = searchCursorForItem(item, "updated");
    expect(parseSearchCursor(defaultNext, "updated")?.dir).toBe("next");
  });
});
