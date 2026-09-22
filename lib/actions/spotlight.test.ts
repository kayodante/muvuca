import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUserMock, getLibraryItemsMock, getTagListMock } = vi.hoisted(
  () => ({
    requireUserMock: vi.fn(),
    getLibraryItemsMock: vi.fn(),
    getTagListMock: vi.fn(),
  }),
);

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: requireUserMock,
}));

vi.mock("@/lib/database/queries/items", () => ({
  getLibraryItems: getLibraryItemsMock,
}));

vi.mock("@/lib/database/queries/tags", () => ({
  getTagList: getTagListMock,
}));

import {
  getSpotlightInitialData,
  searchSpotlightItems,
} from "./spotlight";

describe("spotlight actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSpotlightInitialData", () => {
    it("retorna itens e tags quando o usuário está autenticado", async () => {
      requireUserMock.mockResolvedValue({ id: "user-1", email: "test@example.com" });
      getLibraryItemsMock.mockResolvedValue({
        items: [
          {
            id: "item-1",
            type: "link",
            title: "Muvuca",
            description: "Personal library",
            url: "https://muvuca.app",
            tagIds: ["tag-1"],
            preview: null,
          },
        ],
        tags: [],
        nextCursor: null,
        prevCursor: null,
      });
      getTagListMock.mockResolvedValue([
        {
          id: "tag-1",
          name: "Design",
          colorToken: "lime",
          parentId: null,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      ]);

      const result = await getSpotlightInitialData();

      expect(requireUserMock).toHaveBeenCalled();
      expect(getLibraryItemsMock).toHaveBeenCalledWith({ sort: "newest" });
      expect(getTagListMock).toHaveBeenCalled();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items).toHaveLength(1);
        expect(result.data.tags).toHaveLength(1);
        expect(result.data.items[0]?.title).toBe("Muvuca");
      }
    });

    it("retorna fail com UNKNOWN quando a busca falha", async () => {
      requireUserMock.mockRejectedValue(new Error("Database error"));

      const result = await getSpotlightInitialData();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("UNKNOWN");
      }
    });
  });

  describe("searchSpotlightItems", () => {
    it("busca itens com query e tagId e retorna resultado encapsulado", async () => {
      requireUserMock.mockResolvedValue({ id: "user-1", email: "test@example.com" });
      getLibraryItemsMock.mockResolvedValue({
        items: [
          {
            id: "item-2",
            type: "prompt",
            title: "Prompt",
            description: null,
            contentPreview: "Texto de teste",
            tagIds: [],
          },
        ],
        tags: [],
        nextCursor: null,
        prevCursor: null,
      });
      getTagListMock.mockResolvedValue([]);

      const result = await searchSpotlightItems("teste", "tag-1");

      expect(getLibraryItemsMock).toHaveBeenCalledWith({
        q: "teste",
        tag: "tag-1",
        sort: "newest",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items).toHaveLength(1);
      }
    });

    it("retorna fail com UNKNOWN quando a query falha", async () => {
      requireUserMock.mockResolvedValue({ id: "user-1", email: "test@example.com" });
      getLibraryItemsMock.mockRejectedValue(new Error("RPC failed"));

      const result = await searchSpotlightItems("teste");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("UNKNOWN");
      }
    });
  });
});
