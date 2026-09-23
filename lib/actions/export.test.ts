import { beforeEach, describe, expect, it, vi } from "vitest";

import { ptBR } from "@/lib/i18n/dictionaries/pt-BR";

const { requireUserMock, createClientMock, getDictionaryMock } = vi.hoisted(
  () => ({
    requireUserMock: vi.fn(),
    createClientMock: vi.fn(),
    getDictionaryMock: vi.fn(),
  }),
);

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: requireUserMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/security/logging", () => ({
  logEvent: vi.fn(),
}));

vi.mock("@/lib/i18n/server", () => ({ getDictionary: getDictionaryMock }));

import { exportUserLibrary } from "./export";

describe("exportUserLibrary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({
      id: "user-123",
      email: "user@example.com",
    });
    getDictionaryMock.mockResolvedValue(ptBR);
  });

  it("retorna estrutura completa de ExportData com tags e items mapeados", async () => {
    const mockTags = [
      {
        id: "tag-1",
        name: "Dev",
        slug: "dev",
        color_token: "lime",
        parent_id: null,
        description: "Ferramentas de dev",
        created_at: "2026-08-10T00:00:00Z",
      },
      {
        id: "tag-2",
        name: "Frontend",
        slug: "frontend",
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
        language: null,
        created_at: "2026-08-15T00:00:00Z",
      },
      {
        id: "item-2",
        type: "prompt",
        title: "Refactor Prompt",
        url: null,
        description: null,
        content: "Refactor to clean code",
        language: null,
        created_at: "2026-08-14T00:00:00Z",
      },
      {
        id: "item-3",
        type: "code_component",
        title: "Snippet Python",
        url: null,
        description: null,
        content: "print('oi')",
        language: "python",
        created_at: "2026-08-13T00:00:00Z",
      },
    ];
    const mockItemTags = [
      { item_id: "item-1", tag_id: "tag-2" },
      { item_id: "item-2", tag_id: "tag-1" },
    ];

    const selectCalls: Record<string, string> = {};
    const supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === "tags") {
          return {
            select: vi.fn((columns: string) => {
              selectCalls.tags = columns;
              return {
                order: vi
                  .fn()
                  .mockResolvedValue({ data: mockTags, error: null }),
              };
            }),
          };
        }
        if (table === "library_items") {
          return {
            select: vi.fn((columns: string) => {
              selectCalls.library_items = columns;
              return {
                order: vi
                  .fn()
                  .mockResolvedValue({ data: mockItems, error: null }),
              };
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

    // Sem a coluna no select, a language do code_component se perde no
    // round-trip export→import -- data bug do formato 1.2.
    expect(selectCalls.library_items).toContain("language");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.version).toBe("1.3");
      expect(result.data.tags).toEqual([
        {
          id: "tag-1",
          name: "Dev",
          colorToken: "lime",
          parentId: null,
          description: "Ferramentas de dev",
          createdAt: "2026-08-10T00:00:00Z",
          slug: "dev",
        },
        {
          id: "tag-2",
          name: "Frontend",
          colorToken: "cyan",
          parentId: "tag-1",
          description: null,
          createdAt: "2026-08-11T00:00:00Z",
          slug: "frontend",
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
        {
          id: "item-3",
          type: "code_component",
          title: "Snippet Python",
          url: null,
          description: null,
          content: "print('oi')",
          language: "python",
          tagIds: [],
          createdAt: "2026-08-13T00:00:00Z",
        },
      ]);
    }
  });

  it("não inclui a chave language em itens que não são code_component", async () => {
    const mockItems = [
      {
        id: "item-1",
        type: "link",
        title: "Next.js",
        url: "https://nextjs.org",
        description: null,
        content: null,
        language: null,
        created_at: "2026-08-15T00:00:00Z",
      },
    ];

    const supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === "tags") {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
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
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return { select: vi.fn() };
      }),
    };

    createClientMock.mockResolvedValue(supabaseMock);

    const result = await exportUserLibrary();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items[0]).not.toHaveProperty("language");
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
      expect(result.message).toBe(ptBR.errors.exportFailed);
    }
  });
});
