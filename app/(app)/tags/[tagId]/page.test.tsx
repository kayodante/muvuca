import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getTagByIdMock,
  getTagListMock,
  getChildTagCountMock,
  getTagAncestorsMock,
  getLibraryItemsMock,
  getLibraryItemsCountForTagMock,
  notFoundMock,
} = vi.hoisted(() => ({
  getTagByIdMock: vi.fn(),
  getTagListMock: vi.fn(),
  getChildTagCountMock: vi.fn(),
  getTagAncestorsMock: vi.fn(),
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
  getTagById: getTagByIdMock,
  getTagList: getTagListMock,
  getChildTagCount: getChildTagCountMock,
  getTagAncestors: getTagAncestorsMock,
}));

vi.mock("@/lib/database/queries/items", () => ({
  getLibraryItems: getLibraryItemsMock,
  getLibraryItemsCountForTag: getLibraryItemsCountForTagMock,
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

  it("chama notFound quando tagId não é um UUID válido", async () => {
    await expect(
      TagDetailPage({
        params: Promise.resolve({ tagId: "invalid-uuid" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalled();
    expect(getTagByIdMock).not.toHaveBeenCalled();
  });

  it("chama notFound quando a tag não existe ou não pertence ao usuário", async () => {
    getTagByIdMock.mockResolvedValue(null);

    await expect(
      TagDetailPage({
        params: Promise.resolve({ tagId: validTagId }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(getTagByIdMock).toHaveBeenCalledWith(validTagId);
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("degrada suavemente quando searchParams contêm dados inválidos ou desconhecidos sem chamar notFound", async () => {
    const mockTag = {
      id: validTagId,
      name: "Tecnologia",
      parentId: null,
      description: null,
      colorToken: "tag-blue",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    const mockAncestors = [{ id: validTagId, name: "Tecnologia", depth: 0 }];
    const mockItemsResult = {
      items: [],
      tags: [mockTag],
      nextCursor: null,
      prevCursor: null,
    };

    getTagByIdMock.mockResolvedValue(mockTag);
    getChildTagCountMock.mockResolvedValue(0);
    getTagAncestorsMock.mockResolvedValue(mockAncestors);
    getLibraryItemsMock.mockResolvedValue(mockItemsResult);
    getLibraryItemsCountForTagMock.mockResolvedValue(0);

    const element = await TagDetailPage({
      params: Promise.resolve({ tagId: validTagId }),
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

  it("busca tag, contagem de subtags, ancestrais e itens com rollup e repassa para TagDetailView", async () => {
    const mockTag = {
      id: validTagId,
      name: "Tecnologia",
      parentId: null,
      description: "Tags de tecnologia",
      colorToken: "tag-blue",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    const mockPageTags = [mockTag];
    const mockAncestors = [{ id: validTagId, name: "Tecnologia", depth: 0 }];
    const mockItemsResult = {
      items: [],
      tags: mockPageTags,
      nextCursor: "next-cursor-token",
      prevCursor: "prev-cursor-token",
    };

    getTagByIdMock.mockResolvedValue(mockTag);
    getChildTagCountMock.mockResolvedValue(3);
    getTagAncestorsMock.mockResolvedValue(mockAncestors);
    getLibraryItemsMock.mockResolvedValue(mockItemsResult);
    getLibraryItemsCountForTagMock.mockResolvedValue(7);

    const element = await TagDetailPage({
      params: Promise.resolve({ tagId: validTagId }),
      searchParams: Promise.resolve({ q: "react", sort: "newest" }),
    });

    expect(getTagByIdMock).toHaveBeenCalledWith(validTagId);
    expect(getTagListMock).not.toHaveBeenCalled();
    expect(getChildTagCountMock).toHaveBeenCalledWith(validTagId);
    expect(getTagAncestorsMock).toHaveBeenCalledWith(validTagId);
    expect(getLibraryItemsMock).toHaveBeenCalledWith({
      q: "react",
      sort: "newest",
      tag: validTagId,
    });
    expect(getLibraryItemsCountForTagMock).toHaveBeenCalledWith(validTagId);

    expect(element.props).toEqual({
      tag: mockTag,
      childCount: 3,
      tags: mockPageTags,
      ancestors: mockAncestors,
      items: mockItemsResult.items,
      itemsCount: 7,
      nextCursor: "next-cursor-token",
      prevCursor: "prev-cursor-token",
    });
  });
});
