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

import { exportTagLibrary, exportUserLibrary } from "./export";

function mockRows(
  data: unknown[] | null,
  error: { code: string } | null = null,
) {
  const query = {
    order: vi.fn(),
    range: vi.fn().mockResolvedValue({ data, error }),
  };
  query.order.mockReturnValue(query);
  return query;
}

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
              return mockRows(mockTags);
            }),
          };
        }
        if (table === "library_items") {
          return {
            select: vi.fn((columns: string) => {
              selectCalls.library_items = columns;
              return mockRows(mockItems);
            }),
          };
        }
        if (table === "item_tags") {
          return {
            select: vi.fn().mockReturnValue(mockRows(mockItemTags)),
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
            select: vi.fn().mockReturnValue(mockRows([])),
          };
        }
        if (table === "library_items") {
          return {
            select: vi.fn().mockReturnValue(mockRows(mockItems)),
          };
        }
        if (table === "item_tags") {
          return {
            select: vi.fn().mockReturnValue(mockRows([])),
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
            select: vi.fn().mockReturnValue(mockRows(null, { code: "500" })),
          };
        }
        return {
          select: vi.fn().mockReturnValue(mockRows([])),
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

  it("reads past Supabase's 1000-row response cap", async () => {
    const tags = Array.from({ length: 1001 }, (_, index) => ({
      id: `tag-${index}`,
      name: `Tag ${index}`,
      slug: `tag-${index}`,
      color_token: "lime",
      parent_id: null,
      description: null,
      created_at: "2026-08-10T00:00:00Z",
    }));
    const rows: Record<string, unknown[]> = {
      tags,
      library_items: [],
      item_tags: [],
    };
    createClientMock.mockResolvedValue({
      from: vi.fn((table: string) => ({
        select: vi.fn(() => {
          const query = mockRows([]);
          query.range.mockImplementation(async (from: number, to: number) => ({
            data: rows[table]?.slice(from, to + 1) ?? [],
            error: null,
          }));
          return query;
        }),
      })),
    });

    const result = await exportUserLibrary();
    expect(result.ok && result.data.tags).toHaveLength(1001);
  });
});

describe("exportTagLibrary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({ id: "user-123" });
    getDictionaryMock.mockResolvedValue(ptBR);
  });

  it("rejects an invalid id before querying", async () => {
    expect(await exportTagLibrary("invalid")).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      message: ptBR.errors.invalidTag,
    });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("does not export a tag hidden by RLS", async () => {
    createClientMock.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => mockRows([])),
      })),
    });

    expect(
      await exportTagLibrary("11111111-1111-4111-8111-111111111111"),
    ).toEqual({
      ok: false,
      code: "NOT_FOUND",
      message: ptBR.errors.tagNotFound,
    });
  });
});
