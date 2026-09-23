import { beforeEach, describe, expect, it, vi } from "vitest";
import { ptBR } from "@/lib/i18n/dictionaries/pt-BR";

const {
  getTagByPathMock,
  getTagListMock,
  getChildTagCountMock,
  getLibraryItemsMock,
  getLibraryItemsCountForTagMock,
  notFoundMock,
} = vi.hoisted(() => ({
  getTagByPathMock: vi.fn(),
  getTagListMock: vi.fn(),
  getChildTagCountMock: vi.fn(),
  getLibraryItemsMock: vi.fn(),
  getLibraryItemsCountForTagMock: vi.fn(),
  notFoundMock: vi.fn().mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

// `getTagList` stays mocked only so a stray import wouldn't crash the test;
// TagDetailPage must never call it -- it uses `getChildTagCount` instead.
vi.mock("@/lib/database/queries/tags", () => ({
  getTagByPath: getTagByPathMock,
  getTagList: getTagListMock,
  getChildTagCount: getChildTagCountMock,
}));

vi.mock("@/lib/database/queries/items", () => ({
  getLibraryItems: getLibraryItemsMock,
  getLibraryItemsCountForTag: getLibraryItemsCountForTagMock,
}));

// TagDetailPage now resolves `t` (AAA-215) to pass down to TagDetailView.
// `getDictionary()` reads `cookies()`/`headers()`, unavailable outside a
// real request -- mocked here the same way the data queries above are,
// not because this test cares about locale.
vi.mock("@/lib/i18n/server", () => ({
  getDictionary: vi.fn().mockResolvedValue(ptBR),
}));

vi.mock("@/components/tags/TagDetailView", () => ({
  TagDetailView: (props: unknown) => (
    <div data-testid="tag-detail-view" data-props={JSON.stringify(props)} />
  ),
}));

import TagDetailPage from "./page";

describe("TagDetailPage", () => {
  const validTagId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTag = {
    id: validTagId,
    name: "Tecnologia",
    parentId: "22222222-2222-4222-8222-222222222222",
    description: "Tags de tecnologia",
    colorToken: "tag-blue",
    path: "design/tecnologia",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
  const mockAncestors = [
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Design",
      path: "design",
    },
  ];

  it.each([
    ["segmento com maiúscula", ["Design"]],
    ["segmento com acento", ["ícones"]],
    ["segmento com ponto", ["design", ".."]],
    ["segmento longo demais", ["a".repeat(101)]],
    ["profundidade maior que 6", ["a", "b", "c", "d", "e", "f", "g"]],
  ])(
    "chama notFound sem consultar o banco para %s",
    async (_label, tagPath) => {
      await expect(
        TagDetailPage({
          params: Promise.resolve({ tagPath }),
          searchParams: Promise.resolve({}),
        }),
      ).rejects.toThrow("NEXT_NOT_FOUND");

      expect(notFoundMock).toHaveBeenCalled();
      expect(getTagByPathMock).not.toHaveBeenCalled();
    },
  );

  it("chama notFound quando o caminho não existe ou não pertence ao usuário", async () => {
    getTagByPathMock.mockResolvedValue(null);

    await expect(
      TagDetailPage({
        params: Promise.resolve({ tagPath: ["design", "icones"] }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(getTagByPathMock).toHaveBeenCalledWith(["design", "icones"]);
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("degrada suavemente quando searchParams contêm dados inválidos ou desconhecidos sem chamar notFound", async () => {
    getTagByPathMock.mockResolvedValue({
      tag: mockTag,
      ancestors: mockAncestors,
    });
    getChildTagCountMock.mockResolvedValue(0);
    getLibraryItemsMock.mockResolvedValue({
      items: [],
      tags: [mockTag],
      nextCursor: null,
      prevCursor: null,
    });
    getLibraryItemsCountForTagMock.mockResolvedValue(0);

    const element = await TagDetailPage({
      params: Promise.resolve({ tagPath: ["design", "tecnologia"] }),
      searchParams: Promise.resolve({
        sort: "invalid_sort_value",
        type: "unknown_type",
        utm_source: "newsletter",
      }),
    });

    expect(notFoundMock).not.toHaveBeenCalled();
    expect(getLibraryItemsMock).toHaveBeenCalledWith({
      tag: validTagId,
    });
    expect(getTagListMock).not.toHaveBeenCalled();
    expect(element).toBeDefined();
  });

  it("resolve o caminho uma vez e segue pelo UUID da tag", async () => {
    const mockItemsResult = {
      items: [],
      tags: [mockTag],
      nextCursor: "next-cursor-token",
      prevCursor: "prev-cursor-token",
    };

    getTagByPathMock.mockResolvedValue({
      tag: mockTag,
      ancestors: mockAncestors,
    });
    getChildTagCountMock.mockResolvedValue(3);
    getLibraryItemsMock.mockResolvedValue(mockItemsResult);
    getLibraryItemsCountForTagMock.mockResolvedValue(7);

    const element = await TagDetailPage({
      params: Promise.resolve({ tagPath: ["design", "tecnologia"] }),
      searchParams: Promise.resolve({ q: "react", sort: "newest" }),
    });

    expect(getTagByPathMock).toHaveBeenCalledTimes(1);
    expect(getTagListMock).not.toHaveBeenCalled();
    expect(getChildTagCountMock).toHaveBeenCalledWith(validTagId);
    expect(getLibraryItemsMock).toHaveBeenCalledWith({
      q: "react",
      sort: "newest",
      tag: validTagId,
    });
    expect(getLibraryItemsCountForTagMock).toHaveBeenCalledWith(validTagId);

    // objectContaining, not toEqual: the page also passes `t` (the resolved
    // dictionary) through to TagDetailView, which this test doesn't care about.
    expect(element.props).toEqual(
      expect.objectContaining({
        tag: mockTag,
        childCount: 3,
        tags: mockItemsResult.tags,
        ancestors: mockAncestors,
        items: mockItemsResult.items,
        itemsCount: 7,
        nextCursor: "next-cursor-token",
        prevCursor: "prev-cursor-token",
      }),
    );
  });
});
