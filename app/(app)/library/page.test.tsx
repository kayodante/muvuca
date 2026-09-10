import { beforeEach, describe, expect, it, vi } from "vitest";

const { getTagListMock, getLibraryItemsMock, notFoundMock } = vi.hoisted(
  () => ({
    getTagListMock: vi.fn(),
    getLibraryItemsMock: vi.fn(),
    notFoundMock: vi.fn().mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    }),
  }),
);

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

// `getTagList` stays mocked only so a stray import wouldn't crash the test;
// LibraryPage must never call it (that's the whole point of this page).
vi.mock("@/lib/database/queries/tags", () => ({
  getTagList: getTagListMock,
}));

vi.mock("@/lib/database/queries/items", () => ({
  getLibraryItems: getLibraryItemsMock,
}));

vi.mock("@/components/items/ItemsPage", () => ({
  ItemsPage: (props: unknown) => (
    <div data-testid="items-page" data-props={JSON.stringify(props)} />
  ),
}));

import LibraryPage from "./page";

describe("LibraryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLibraryItemsMock.mockResolvedValue({
      items: [],
      tags: [],
      nextCursor: null,
      prevCursor: null,
    });
  });

  it("renderiza a biblioteca com search params válidos", async () => {
    const mockItems = [{ id: "item-1" }];
    const mockTags = [{ id: "tag-1" }];
    getLibraryItemsMock.mockResolvedValue({
      items: mockItems,
      tags: mockTags,
      nextCursor: "next-cursor-token",
      prevCursor: "prev-cursor-token",
    });

    const element = await LibraryPage({
      searchParams: Promise.resolve({ q: "nextjs", sort: "title_asc" }),
    });

    expect(notFoundMock).not.toHaveBeenCalled();
    expect(getLibraryItemsMock).toHaveBeenCalledWith({
      q: "nextjs",
      sort: "title_asc",
    });
    expect(getTagListMock).not.toHaveBeenCalled();
    expect(element.props).toEqual({
      items: mockItems,
      tags: mockTags,
      nextCursor: "next-cursor-token",
      prevCursor: "prev-cursor-token",
    });
  });

  it("não chama notFound e degrada suavemente quando search params forem inválidos ou desconhecidos", async () => {
    const element = await LibraryPage({
      searchParams: Promise.resolve({
        sort: "alpha",
        type: "video",
        tag: "not-a-uuid",
        utm_source: "google",
        ref: "hackernews",
      }),
    });

    expect(notFoundMock).not.toHaveBeenCalled();
    expect(getLibraryItemsMock).toHaveBeenCalledWith({});
    expect(getTagListMock).not.toHaveBeenCalled();
    expect(element).toBeDefined();
  });
});
