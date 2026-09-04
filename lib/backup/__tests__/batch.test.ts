import { describe, expect, it } from "vitest";

import { BackupImportError, toBackupPayload } from "../batch";
import { MAX_BACKUP_FILE_SIZE } from "../types";
import {
  backupFileSchema,
  backupPayloadSchema,
  type BackupFile,
} from "../validation";

const ROOT = "11111111-1111-4111-8111-111111111111";
const CHILD = "22222222-2222-4222-8222-222222222222";
const TAG_A = "55555555-5555-4555-8555-555555555555";
const TAG_B = "66666666-6666-4666-8666-666666666666";

function parse(file: unknown): BackupFile {
  const result = backupFileSchema.safeParse(file);
  if (!result.success) throw new Error("fixture inválida");
  return result.data;
}

function fileWithChildBeforeParent(): BackupFile {
  return parse({
    version: "1.0",
    exportedAt: "2026-08-16T12:00:00+00:00",
    // Ordem deliberadamente "errada": o filho vem primeiro, como acontece
    // quando uma tag antiga é reparentada sob uma tag nova.
    tags: [
      { id: CHILD, name: "Frontend", colorToken: "cyan", parentId: ROOT },
      { id: ROOT, name: "Dev", colorToken: "lime", parentId: null },
    ],
    items: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        type: "link",
        title: "Next.js",
        url: "https://nextjs.org/",
        description: null,
        content: null,
        tagIds: [CHILD],
        createdAt: "2026-08-15T00:00:00+00:00",
      },
    ],
  });
}

describe("toBackupPayload", () => {
  it("ordena tags com o pai antes do filho", () => {
    const { tags } = toBackupPayload(fileWithChildBeforeParent());
    expect(tags.map((tag) => tag.key)).toEqual([ROOT, CHILD]);
  });

  it("converte ids do arquivo em chaves simbólicas do payload sem carregar normalizedUrl", () => {
    const { items } = toBackupPayload(fileWithChildBeforeParent());
    expect(items[0]).toEqual({
      type: "link",
      title: "Next.js",
      url: "https://nextjs.org/",
      content: null,
      description: null,
      createdAt: "2026-08-15T00:00:00+00:00",
      tagKeys: [CHILD],
    });
  });

  it("converte itens code_component preservando content e url", () => {
    const file = parse({
      version: "1.1",
      exportedAt: "2026-08-16T12:00:00+00:00",
      tags: [{ id: ROOT, name: "Dev", colorToken: "lime", parentId: null }],
      items: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          type: "code_component",
          title: "Button Component",
          url: "https://example.com/btn",
          content: "export const Button = () => null;",
          description: "Button",
          tagIds: [ROOT],
          createdAt: "2026-08-15T00:00:00+00:00",
        },
      ],
    });

    const { items } = toBackupPayload(file);
    expect(items[0]).toEqual({
      type: "code_component",
      title: "Button Component",
      url: "https://example.com/btn",
      content: "export const Button = () => null;",
      description: "Button",
      createdAt: "2026-08-15T00:00:00+00:00",
      tagKeys: [ROOT],
    });
  });
});

describe("sortTagsByHierarchy (via toBackupPayload)", () => {
  it("rejeita um ciclo de 2 tags que passou pela validação do arquivo", () => {
    // backupFileSchema só rejeita auto-referência e pai inexistente; um
    // ciclo entre duas tags (A pai de B, B pai de A) passa incólume e só é
    // pego aqui, no guard de sortTagsByHierarchy.
    const file = parse({
      version: "1.0",
      exportedAt: "2026-08-16T12:00:00+00:00",
      tags: [
        { id: TAG_A, name: "A", colorToken: "lime", parentId: TAG_B },
        { id: TAG_B, name: "B", colorToken: "cyan", parentId: TAG_A },
      ],
      items: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          type: "link",
          title: "Item",
          url: "https://exemplo.com/",
          description: null,
          content: null,
          tagIds: [TAG_A],
          createdAt: "2026-08-15T00:00:00+00:00",
        },
      ],
    });

    expect(() => toBackupPayload(file)).toThrow(BackupImportError);
  });
});

describe("toBackupPayload (sem lotes)", () => {
  it("manda todas as tags e todos os itens numa única chamada", () => {
    // Regressão contra reintroduzir fatiamento em várias chamadas: cada
    // chamada tem sua própria transação, então restaurar em lotes separados
    // quebra a atomicidade da RPC.
    const file = parse({
      version: "1.0",
      exportedAt: "2026-08-16T12:00:00+00:00",
      tags: [
        { id: ROOT, name: "Dev", colorToken: "lime", parentId: null },
        { id: CHILD, name: "Frontend", colorToken: "cyan", parentId: ROOT },
      ],
      items: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          type: "link",
          title: "Um",
          url: "https://um.example/",
          description: null,
          content: null,
          tagIds: [],
          createdAt: "2026-08-15T00:00:00+00:00",
        },
        {
          id: "44444444-4444-4444-8444-444444444444",
          type: "link",
          title: "Dois",
          url: "https://dois.example/",
          description: null,
          content: null,
          tagIds: [CHILD],
          createdAt: "2026-08-15T00:00:00+00:00",
        },
      ],
    });

    const { tags, items } = toBackupPayload(file);

    expect(tags.map((tag) => tag.key)).toEqual([ROOT, CHILD]);
    expect(items.map((item) => item.title)).toEqual(["Um", "Dois"]);
  });
});

describe("Boundary de tamanho: arquivo de 10 MB vs Server Action", () => {
  it("garante que um arquivo no limite de 10 MB gera payload menor que 10 MB e abaixo do limite de 12 MB da Server Action", () => {
    // Constrói um arquivo válido de ~9.5 MB composto por links e prompts
    const largePromptContent = "a".repeat(95_000); // 95 KB por prompt
    const numItems = 100;
    const rawItems = Array.from({ length: numItems }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      type: "prompt" as const,
      title: `Prompt ${i}`,
      url: null,
      description: null,
      content: largePromptContent,
      tagIds: [ROOT],
      createdAt: "2026-08-15T00:00:00+00:00",
    }));

    const rawFile = {
      version: "1.1" as const,
      exportedAt: "2026-08-16T12:00:00+00:00",
      tags: [
        {
          id: ROOT,
          name: "Dev",
          colorToken: "lime",
          parentId: null,
          description: null,
          createdAt: "2026-08-10T00:00:00+00:00",
        },
      ],
      items: rawItems,
    };

    const fileJson = JSON.stringify(rawFile);
    const fileBytes = Buffer.byteLength(fileJson, "utf8");

    // Confirma que a fixture está próxima de 10 MB (entre 9.5 MB e 10 MB)
    expect(fileBytes).toBeGreaterThan(9_500_000);
    expect(fileBytes).toBeLessThanOrEqual(MAX_BACKUP_FILE_SIZE);

    // Validação de entrada
    const parsedFile = backupFileSchema.parse(rawFile);

    // Transformação em payload
    const { tags, items } = toBackupPayload(parsedFile);
    const payload = { tags, items };

    // Validação da fronteira da Server Action
    expect(backupPayloadSchema.safeParse(payload).success).toBe(true);

    const payloadJson = JSON.stringify(payload);
    const payloadBytes = Buffer.byteLength(payloadJson, "utf8");

    // O payload transportado deve ser menor ou igual ao arquivo JSON original
    // (já que remove campos desnecessários como id/version e não duplica URLs)
    expect(payloadBytes).toBeLessThanOrEqual(fileBytes);
    expect(payloadBytes).toBeLessThan(MAX_BACKUP_FILE_SIZE);
    // E estritamente abaixo do limite de 12 MB (12_000_000 bytes) da Server Action
    expect(payloadBytes).toBeLessThan(12_000_000);
  });
});
