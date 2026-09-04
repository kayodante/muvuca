import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUserMock, createClientMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  createClientMock: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: requireUserMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/security/logging", () => ({
  logEvent: vi.fn(),
}));

import { exportUserLibrary } from "./export";

describe("exportUserLibrary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({
      id: "user-123",
      email: "user@example.com",
    });
  });

  it("retorna estrutura completa de ExportData com tags e items mapeados", async () => {
    const mockTags = [
      {
        id: "tag-1",
        name: "Dev",
        color_token: "lime",
        parent_id: null,
        description: "Ferramentas de dev",
        created_at: "2026-08-10T00:00:00Z",
      },
      {
        id: "tag-2",
        name: "Frontend",
        color_token: "cyan",
        parent_id: "tag-1",
        description: null,
        created_at: "2026-08-11T00:00:00Z",
      },
    ];
    const mockItems = [
      {
        id: "item-1",
        type: "link",
        title: "Next.js",
        url: "https://nextjs.org",
        description: "Framework React",
        content: null,
        created_at: "2026-08-15T00:00:00Z",
      },
      {
        id: "item-2",
        type: "prompt",
        title: "Refactor Prompt",
        url: null,
        description: null,
        content: "Refactor to clean code",
        created_at: "2026-08-14T00:00:00Z",
      },
    ];
    const mockItemTags = [
      { item_id: "item-1", tag_id: "tag-2" },
      { item_id: "item-2", tag_id: "tag-1" },
    ];

    const supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === "tags") {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockTags, error: null }),
            }),
          };
        }
        if (table === "library_items") {
          return {
            select: vi.fn().mockReturnValue({
              order: vi
                .fn()
                .mockResolvedValue({ data: mockItems, error: null }),
            }),
          };
        }
        if (table === "item_tags") {
          return {
            select: vi
              .fn()
              .mockResolvedValue({ data: mockItemTags, error: null }),
          };
        }
        return { select: vi.fn() };
      }),
    };

    createClientMock.mockResolvedValue(supabaseMock);

    const result = await exportUserLibrary();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.version).toBe("1.1");
      expect(result.data.tags).toEqual([
        {
          id: "tag-1",
          name: "Dev",
          colorToken: "lime",
          parentId: null,
          description: "Ferramentas de dev",
          createdAt: "2026-08-10T00:00:00Z",
        },
        {
          id: "tag-2",
          name: "Frontend",
          colorToken: "cyan",
          parentId: "tag-1",
          description: null,
          createdAt: "2026-08-11T00:00:00Z",
        },
      ]);
      expect(result.data.items).toEqual([
        {
          id: "item-1",
          type: "link",
          title: "Next.js",
          url: "https://nextjs.org",
          description: "Framework React",
          content: null,
          tagIds: ["tag-2"],
          createdAt: "2026-08-15T00:00:00Z",
        },
        {
          id: "item-2",
          type: "prompt",
          title: "Refactor Prompt",
          url: null,
          description: null,
          content: "Refactor to clean code",
          tagIds: ["tag-1"],
          createdAt: "2026-08-14T00:00:00Z",
        },
      ]);
    }
  });

  it("retorna erro fail('UNKNOWN') caso ocorra falha ao buscar tags", async () => {
    const supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === "tags") {
          return {
            select: vi.fn().mockReturnValue({
              order: vi
                .fn()
                .mockResolvedValue({ data: null, error: { code: "500" } }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }),
    };

    createClientMock.mockResolvedValue(supabaseMock);

    const result = await exportUserLibrary();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("UNKNOWN");
      expect(result.message).toBe("Falha ao gerar dados de exportação.");
    }
  });
});
