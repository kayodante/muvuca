import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, rpcMock } = vi.hoisted(() => {
  const rpc = vi.fn();
  // Every row built by makeItemRow() below is type "link", so
  // getLibraryItems() always calls getPreviewsForItems() -- this mock
  // just needs to answer "no previews found" without throwing.
  const inFn = vi.fn().mockResolvedValue({ data: [], error: null });
  const select = vi.fn().mockReturnValue({ in: inFn });
  const from = vi.fn().mockReturnValue({ select });
  return {
    rpcMock: rpc,
    createClientMock: vi.fn().mockResolvedValue({ rpc, from }),
  };
});

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));

import { getLibraryItems } from "@/lib/database/queries/items";
import { encodeSearchCursor, parseSearchCursor } from "@/lib/validation/search";

function makeItemRow(index: number) {
  const num = String(index).padStart(2, "0");
  return {
    id: `11111111-1111-4111-8111-1111111111${num}`,
    type: "link" as const,
    title: `Item ${num}`,
    description: null,
    url: `https://example.com/${num}`,
    content_preview: null,
    tag_ids: [],
    created_at: `2026-08-16T12:00:${num}.000Z`,
    updated_at: `2026-08-16T12:00:${num}.000Z`,
  };
}

describe("getLibraryItems bidirectional pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns prevCursor null and nextCursor when on page 1 with > 48 items", async () => {
    const rows = Array.from({ length: 49 }, (_, i) => makeItemRow(49 - i));
    rpcMock.mockResolvedValue({ data: rows, error: null });

    const result = await getLibraryItems();

    expect(result.items).toHaveLength(48);
    expect(result.prevCursor).toBeNull();
    expect(result.nextCursor).not.toBeNull();

    const parsedNext = parseSearchCursor(result.nextCursor!, "newest");
    expect(parsedNext).toMatchObject({
      sort: "newest",
      dir: "next",
      id: rows[47]!.id,
    });
  });

  it("returns prevCursor null and nextCursor null when page has <= 48 items", async () => {
    const rows = Array.from({ length: 20 }, (_, i) => makeItemRow(20 - i));
    rpcMock.mockResolvedValue({ data: rows, error: null });

    const result = await getLibraryItems();

    expect(result.items).toHaveLength(20);
    expect(result.prevCursor).toBeNull();
    expect(result.nextCursor).toBeNull();
  });

  it("returns both prevCursor and nextCursor when forward on page 2 with more items", async () => {
    const page1Cursor = encodeSearchCursor({
      sort: "newest",
      timestamp: "2026-08-16T12:00:50.000Z",
      id: "11111111-1111-4111-8111-111111111150",
      dir: "next",
    });

    const rows = Array.from({ length: 49 }, (_, i) => makeItemRow(49 - i));
    rpcMock.mockResolvedValue({ data: rows, error: null });

    const result = await getLibraryItems({ cursor: page1Cursor });

    expect(result.items).toHaveLength(48);
    expect(result.prevCursor).not.toBeNull();
    expect(result.nextCursor).not.toBeNull();

    const parsedPrev = parseSearchCursor(result.prevCursor!, "newest");
    expect(parsedPrev).toMatchObject({
      sort: "newest",
      dir: "prev",
      id: rows[0]!.id,
    });

    const parsedNext = parseSearchCursor(result.nextCursor!, "newest");
    expect(parsedNext).toMatchObject({
      sort: "newest",
      dir: "next",
      id: rows[47]!.id,
    });
  });

  it("reverses rows and keeps prevCursor when backward query returns > 48 rows", async () => {
    const page3PrevCursor = encodeSearchCursor({
      sort: "newest",
      timestamp: "2026-08-16T12:00:00.000Z",
      id: "11111111-1111-4111-8111-111111111100",
      dir: "prev",
    });

    // DB returned ascending scanned items: [1..49]
    const rows = Array.from({ length: 49 }, (_, i) => makeItemRow(i + 1));
    rpcMock.mockResolvedValue({ data: rows, error: null });

    const result = await getLibraryItems({ cursor: page3PrevCursor });

    // Result should be sliced to 48 and reversed to standard desc order: [48..1]
    expect(result.items).toHaveLength(48);
    expect(result.items[0]!.id).toBe(rows[47]!.id);
    expect(result.items[47]!.id).toBe(rows[0]!.id);

    expect(result.prevCursor).not.toBeNull();
    expect(result.nextCursor).not.toBeNull();

    const parsedPrev = parseSearchCursor(result.prevCursor!, "newest");
    expect(parsedPrev).toMatchObject({
      sort: "newest",
      dir: "prev",
      id: rows[47]!.id,
    });

    const parsedNext = parseSearchCursor(result.nextCursor!, "newest");
    expect(parsedNext).toMatchObject({
      sort: "newest",
      dir: "next",
      id: rows[0]!.id,
    });
  });

  it("reverses rows and sets prevCursor to null when backward query reaches first page (<= 48 rows)", async () => {
    const page2PrevCursor = encodeSearchCursor({
      sort: "newest",
      timestamp: "2026-08-16T12:00:00.000Z",
      id: "11111111-1111-4111-8111-111111111100",
      dir: "prev",
    });

    // DB returned 48 rows ascending: [1..48]
    const rows = Array.from({ length: 48 }, (_, i) => makeItemRow(i + 1));
    rpcMock.mockResolvedValue({ data: rows, error: null });

    const result = await getLibraryItems({ cursor: page2PrevCursor });

    expect(result.items).toHaveLength(48);
    expect(result.items[0]!.id).toBe(rows[47]!.id);
    expect(result.items[47]!.id).toBe(rows[0]!.id);

    expect(result.prevCursor).toBeNull();
    expect(result.nextCursor).not.toBeNull();
  });
});
