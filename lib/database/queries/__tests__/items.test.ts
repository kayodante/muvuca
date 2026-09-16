import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createClientMock,
  rpcMock,
  tagsInMock,
  tagsOrderMock,
  libItemsSelectMock,
  libItemsMaybeSingleMock,
  libItemsCountMock,
  itemTagsEqMock,
} = vi.hoisted(() => {
  const rpc = vi.fn();
  // Every row built by makeItemRow() below is type "link", so
  // getLibraryItems() always calls getPreviewsForItems() -- this mock
  // just needs to answer "no previews found" without throwing.
  const previewsIn = vi.fn().mockResolvedValue({ data: [], error: null });
  const previewsSelect = vi.fn().mockReturnValue({ in: previewsIn });

  // getTagsByIds() only reaches `from("tags")` when a page row carries
  // tag_ids -- most fixtures below have none, so this chain answers
  // "no tags found" without throwing when it is touched.
  const tagsOrder = vi.fn().mockResolvedValue({ data: [], error: null });
  const tagsIn = vi.fn().mockReturnValue({ order: tagsOrder });
  const tagsSelect = vi.fn().mockReturnValue({ in: tagsIn });

  // getLibraryItemById() chains: from("library_items").select(...).eq(id).maybeSingle()
  // and from("item_tags").select(...).eq(item_id).
  const libItemsMaybeSingle = vi.fn();
  const libItemsEq = vi
    .fn()
    .mockReturnValue({ maybeSingle: libItemsMaybeSingle });
  // `getLibraryItemById` encadeia `.eq(...)`; `getLibraryItemsCount` aguarda o
  // retorno de `.select()` direto. O segundo argumento (`{ head: true }`)
  // distingue os dois no mesmo mock de `select`.
  const libItemsCount = vi.fn();
  const libItemsSelect = vi.fn(
    (_columns: string, options?: { count?: string; head?: boolean }) =>
      options?.head ? libItemsCount() : { eq: libItemsEq },
  );
  const itemTagsEq = vi.fn().mockResolvedValue({ data: [], error: null });
  const itemTagsSelect = vi.fn().mockReturnValue({ eq: itemTagsEq });

  const from = vi.fn((table: string) => {
    if (table === "tags") return { select: tagsSelect };
    if (table === "library_items") return { select: libItemsSelect };
    if (table === "item_tags") return { select: itemTagsSelect };
    return { select: previewsSelect };
  });

  return {
    rpcMock: rpc,
    tagsInMock: tagsIn,
    tagsOrderMock: tagsOrder,
    libItemsSelectMock: libItemsSelect,
    libItemsMaybeSingleMock: libItemsMaybeSingle,
    libItemsCountMock: libItemsCount,
    itemTagsEqMock: itemTagsEq,
    createClientMock: vi.fn().mockResolvedValue({ rpc, from }),
  };
});

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));

import {
  getLibraryItemById,
  getLibraryItems,
  getLibraryItemsCount,
} from "@/lib/database/queries/items";
import { encodeSearchCursor, parseSearchCursor } from "@/lib/validation/search";

function makeItemRow(index: number, tagIds: string[] = []) {
  const num = String(index).padStart(2, "0");
  return {
    id: `11111111-1111-4111-8111-1111111111${num}`,
    type: "link" as const,
    title: `Item ${num}`,
    description: null,
    url: `https://example.com/${num}`,
    content_preview: null,
    language: null,
    tag_ids: tagIds,
    created_at: `2026-08-16T12:00:${num}.000Z`,
    updated_at: `2026-08-16T12:00:${num}.000Z`,
  };
}

function makeCodeRow(language: string | null) {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    type: "code_component" as const,
    title: "Snippet",
    description: null,
    url: null,
    content_preview: "export const x = 1;",
    language,
    tag_ids: [],
    created_at: "2026-08-16T12:00:00.000Z",
    updated_at: "2026-08-16T12:00:00.000Z",
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

describe("getLibraryItems tags aggregation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only the tags referenced by the page's items", async () => {
    const rows = [
      makeItemRow(1, ["tag-a", "tag-b"]),
      makeItemRow(2, ["tag-b"]),
    ];
    rpcMock.mockResolvedValue({ data: rows, error: null });
    tagsOrderMock.mockResolvedValue({
      data: [
        {
          id: "tag-a",
          parent_id: null,
          name: "A",
          description: null,
          color_token: "lime",
          created_at: "2026-08-16T00:00:00.000Z",
          updated_at: "2026-08-16T00:00:00.000Z",
        },
        {
          id: "tag-b",
          parent_id: null,
          name: "B",
          description: null,
          color_token: "lime",
          created_at: "2026-08-16T00:00:00.000Z",
          updated_at: "2026-08-16T00:00:00.000Z",
        },
      ],
      error: null,
    });

    const result = await getLibraryItems();

    // Union of tag_ids across the page, deduplicated -- not the caller's
    // whole tag list.
    expect(tagsInMock).toHaveBeenCalledWith("id", ["tag-a", "tag-b"]);
    expect(result.tags).toEqual([
      {
        id: "tag-a",
        parentId: null,
        name: "A",
        description: null,
        colorToken: "lime",
        createdAt: "2026-08-16T00:00:00.000Z",
        updatedAt: "2026-08-16T00:00:00.000Z",
      },
      {
        id: "tag-b",
        parentId: null,
        name: "B",
        description: null,
        colorToken: "lime",
        createdAt: "2026-08-16T00:00:00.000Z",
        updatedAt: "2026-08-16T00:00:00.000Z",
      },
    ]);
  });

  it("does not query tags when no item on the page has tag_ids", async () => {
    const rows = [makeItemRow(1), makeItemRow(2)];
    rpcMock.mockResolvedValue({ data: rows, error: null });

    const result = await getLibraryItems();

    expect(result.tags).toEqual([]);
    expect(tagsInMock).not.toHaveBeenCalled();
  });
});

describe("getLibraryItems language mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes a supported code_component language on the summary", async () => {
    rpcMock.mockResolvedValue({
      data: [makeCodeRow("python")],
      error: null,
    });

    const result = await getLibraryItems();

    expect(result.items[0]).toMatchObject({
      type: "code_component",
      language: "python",
    });
  });

  it("exposes null when the code_component has no language", async () => {
    rpcMock.mockResolvedValue({ data: [makeCodeRow(null)], error: null });

    const result = await getLibraryItems();

    expect(result.items[0]).toMatchObject({
      type: "code_component",
      language: null,
    });
  });

  // generated.types.ts tipos `language` como `string` (não-nulo) nos RETURNS
  // de search_library, mas o Postgres pode devolver null ou um valor fora da
  // allowlist original. O mapper não confia no tipo gerado: tudo que não passa
  // no isCodeLanguage vira null.
  it("maps an unknown stored language to null", async () => {
    rpcMock.mockResolvedValue({
      data: [makeCodeRow("cobol")],
      error: null,
    });

    const result = await getLibraryItems();

    expect(result.items[0]).toMatchObject({
      type: "code_component",
      language: null,
    });
  });
});

describe("getLibraryItemById", () => {
  const itemId = "22222222-2222-4222-8222-222222222222";

  beforeEach(() => {
    vi.clearAllMocks();
    itemTagsEqMock.mockResolvedValue({
      data: [{ item_id: itemId, tag_id: "tag-1" }],
      error: null,
    });
  });

  function mockItemRow(row: Record<string, unknown>) {
    libItemsMaybeSingleMock.mockResolvedValue({ data: row, error: null });
  }

  it("selects the language column and returns a validated code_component language", async () => {
    mockItemRow({
      id: itemId,
      type: "code_component",
      title: "Snippet",
      description: null,
      url: null,
      content: "export const x = 1;",
      language: "rust",
    });

    const item = await getLibraryItemById(itemId);

    expect(libItemsSelectMock).toHaveBeenCalledWith(
      "id, type, title, description, url, content, language",
    );
    expect(item).toMatchObject({
      type: "code_component",
      language: "rust",
      tagIds: ["tag-1"],
    });
  });

  it("maps an unknown stored language to null on a code_component", async () => {
    mockItemRow({
      id: itemId,
      type: "code_component",
      title: "Snippet",
      description: null,
      url: null,
      content: "export const x = 1;",
      language: "cobol",
    });

    const item = await getLibraryItemById(itemId);

    expect(item).toMatchObject({ type: "code_component", language: null });
  });

  it("does not carry a language field on link items", async () => {
    mockItemRow({
      id: itemId,
      type: "link",
      title: "Link",
      description: null,
      url: "https://example.com",
      content: null,
      language: null,
    });

    const item = await getLibraryItemById(itemId);

    expect(item).toMatchObject({ type: "link" });
    expect(item && "language" in item).toBe(false);
  });
});

describe("getLibraryItemsCount", () => {
  it("devolve a contagem total do usuário", async () => {
    libItemsCountMock.mockResolvedValue({ count: 1040, error: null });

    await expect(getLibraryItemsCount()).resolves.toBe(1040);
    expect(libItemsSelectMock).toHaveBeenCalledWith("id", {
      count: "exact",
      head: true,
    });
  });

  it("trata count nulo como zero", async () => {
    libItemsCountMock.mockResolvedValue({ count: null, error: null });

    await expect(getLibraryItemsCount()).resolves.toBe(0);
  });

  it("propaga o erro em vez de devolver zero", async () => {
    const error = new Error("rls denied");
    libItemsCountMock.mockResolvedValue({ count: null, error });

    await expect(getLibraryItemsCount()).rejects.toBe(error);
  });
});
