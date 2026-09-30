import { beforeEach, describe, expect, it, vi } from "vitest";

import { ptBR } from "@/lib/i18n/dictionaries/pt-BR";

const { requireUserMock, createClientMock, rpcMock, getDictionaryMock } =
  vi.hoisted(() => ({
    requireUserMock: vi.fn(),
    createClientMock: vi.fn(),
    rpcMock: vi.fn(),
    getDictionaryMock: vi.fn(),
  }));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: requireUserMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/security/logging", () => ({ logEvent: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/i18n/server", () => ({ getDictionary: getDictionaryMock }));

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
    getDictionaryMock.mockResolvedValue(ptBR);
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
      expect(result.message).toBe(ptBR.errors.backupNeedsRevalidation);
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
          // Formato 1.2: a language precisa chegar à RPC junto com o item.
          language: "python",
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
      expect(result.message).toBe(ptBR.errors.backupRestoreFailed);
    }
  });

  describe("tag de destino", () => {
    const TARGET = "22222222-2222-4222-8222-222222222222";
    const okRpc = {
      data: [{ items_imported: 1, tags_created: 1, duplicates_ignored: 0 }],
      error: null,
    };

    it("repassa p_target_tag_id quando targetTagId vem", async () => {
      rpcMock.mockResolvedValue(okRpc);
      await importLibraryBackup({ ...validBatch(), targetTagId: TARGET });
      expect(rpcMock.mock.calls[0]?.[1]?.p_target_tag_id).toBe(TARGET);
    });

    it("sem targetTagId, p_target_tag_id não carrega valor", async () => {
      rpcMock.mockResolvedValue(okRpc);
      await importLibraryBackup(validBatch());
      expect(rpcMock.mock.calls[0]?.[1]?.p_target_tag_id).toBeUndefined();
    });

    it("rejeita targetTagId não-UUID sem chamar a RPC", async () => {
      const result = await importLibraryBackup({
        ...validBatch(),
        targetTagId: "nope",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("VALIDATION_FAILED");
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it("traduz P0001 de profundidade", async () => {
      rpcMock.mockResolvedValue({
        data: null,
        error: {
          code: "P0001",
          message:
            "a hierarquia de tags excede a profundidade máxima de 6 níveis",
        },
      });
      const result = await importLibraryBackup({
        ...validBatch(),
        targetTagId: TARGET,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("CONSTRAINT_VIOLATION");
        expect(result.message).toBe(ptBR.errors.tagMaxDepth);
      }
    });

    it("traduz P0001 de tag não encontrada como NOT_FOUND", async () => {
      rpcMock.mockResolvedValue({
        data: null,
        error: { code: "P0001", message: "tag não encontrada" },
      });
      const result = await importLibraryBackup({
        ...validBatch(),
        targetTagId: TARGET,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("NOT_FOUND");
        expect(result.message).toBe(ptBR.errors.tagNotFound);
      }
    });

    it("P0001 desconhecido cai no erro genérico", async () => {
      rpcMock.mockResolvedValue({
        data: null,
        error: { code: "P0001", message: "algo inesperado" },
      });
      const result = await importLibraryBackup(validBatch());
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("UNKNOWN");
        expect(result.message).toBe(ptBR.errors.backupRestoreFailed);
      }
    });
  });
});
