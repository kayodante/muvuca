import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUserMock, createClientMock, rpcMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  createClientMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: requireUserMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/security/logging", () => ({ logEvent: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { importLibraryBackup } from "./backup";

const TAG_KEY = "11111111-1111-4111-8111-111111111111";

function validBatch() {
  return {
    tags: [
      {
        key: TAG_KEY,
        parentKey: null,
        name: "Dev",
        colorToken: "lime",
        description: null,
        createdAt: null,
      },
    ],
    items: [
      {
        type: "link" as const,
        title: "Next.js",
        url: "https://nextjs.org/",
        content: null,
        description: null,
        createdAt: "2026-08-15T00:00:00+00:00",
        tagKeys: [TAG_KEY],
      },
    ],
  };
}

describe("importLibraryBackup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({ id: "user-123" });
    createClientMock.mockResolvedValue({ rpc: rpcMock });
  });

  it("retorna resumo zerado imediatamente ao receber backup completamente vazio sem chamar RPC", async () => {
    const result = await importLibraryBackup({ tags: [], items: [] });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        itemsImported: 0,
        tagsCreated: 0,
        duplicatesIgnored: 0,
      });
    }
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("rejeita payload inválido sem chamar o banco", async () => {
    const result = await importLibraryBackup({
      tags: [{ key: "not-a-uuid" }],
      items: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("VALIDATION_FAILED");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("não vaza detalhe interno na mensagem de erro de validação", async () => {
    const result = await importLibraryBackup({
      tags: [{ key: "not-a-uuid" }],
      items: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe(
        "O arquivo de backup precisa ser analisado novamente.",
      );
    }
  });

  it("mapeia o resumo devolvido pela RPC e calcula normalizedUrl no servidor", async () => {
    rpcMock.mockResolvedValue({
      data: [{ items_imported: 1, tags_created: 1, duplicates_ignored: 0 }],
      error: null,
    });

    const result = await importLibraryBackup(validBatch());

    expect(rpcMock).toHaveBeenCalledWith("import_library_backup", {
      p_tags: validBatch().tags,
      p_items: [
        {
          ...validBatch().items[0],
          normalizedUrl: "https://nextjs.org/",
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        itemsImported: 1,
        tagsCreated: 1,
        duplicatesIgnored: 0,
      });
    }
  });

  it("mapeia o resumo devolvido pela RPC e calcula normalizedUrl no servidor para code_component com e sem URL", async () => {
    rpcMock.mockResolvedValue({
      data: [{ items_imported: 2, tags_created: 1, duplicates_ignored: 0 }],
      error: null,
    });

    const batchWithCodeComponents = {
      tags: validBatch().tags,
      items: [
        {
          type: "code_component" as const,
          title: "Button Component",
          url: "https://ui.shadcn.com/docs/components/button",
          content: "export function Button() { return <button />; }",
          description: "Shadcn button",
          createdAt: "2026-08-15T00:00:00+00:00",
          tagKeys: [TAG_KEY],
        },
        {
          type: "code_component" as const,
          title: "Local Hook",
          url: null,
          content: "export function useToggle() { return false; }",
          description: null,
          createdAt: "2026-08-15T00:00:00+00:00",
          tagKeys: [TAG_KEY],
        },
      ],
    };

    const result = await importLibraryBackup(batchWithCodeComponents);

    expect(rpcMock).toHaveBeenCalledWith("import_library_backup", {
      p_tags: batchWithCodeComponents.tags,
      p_items: [
        {
          ...batchWithCodeComponents.items[0],
          normalizedUrl: "https://ui.shadcn.com/docs/components/button",
        },
        {
          ...batchWithCodeComponents.items[1],
          normalizedUrl: null,
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        itemsImported: 2,
        tagsCreated: 1,
        duplicatesIgnored: 0,
      });
    }
  });

  it("devolve erro genérico quando a RPC falha", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: "P0001" } });

    const result = await importLibraryBackup(validBatch());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("UNKNOWN");
      expect(result.message).toBe("Não foi possível concluir a restauração.");
    }
  });
});
