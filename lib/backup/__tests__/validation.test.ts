import { describe, expect, it } from "vitest";

import { backupFileSchema, backupPayloadSchema } from "../validation";
import type { ExportData } from "@/lib/export/formatter";

// Tipada contra ExportData (a saída real do exportador) para que esta
// fixture pare de compilar se o contrato "saída do export é entrada válida
// do import" divergir silenciosamente.
function validFile(): ExportData {
  return {
    version: "1.1",
    exportedAt: "2026-08-16T12:00:00+00:00",
    tags: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Dev",
        colorToken: "lime",
        parentId: null,
        description: "Ferramentas de dev",
        createdAt: "2026-08-10T00:00:00+00:00",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Frontend",
        colorToken: "cyan",
        parentId: "11111111-1111-4111-8111-111111111111",
        description: null,
        createdAt: "2026-08-11T00:00:00+00:00",
      },
    ],
    items: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        type: "link",
        title: "Next.js",
        url: "https://nextjs.org/",
        description: "Framework React",
        content: null,
        tagIds: ["22222222-2222-4222-8222-222222222222"],
        createdAt: "2026-08-15T00:00:00+00:00",
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        type: "prompt",
        title: "Refatorar",
        url: null,
        description: null,
        content: "Refatore este código",
        tagIds: [],
        createdAt: "2026-08-14T00:00:00+00:00",
      },
    ],
  };
}

describe("backupFileSchema", () => {
  it("aceita o arquivo produzido pelo exportador (versão 1.1)", () => {
    expect(backupFileSchema.safeParse(validFile()).success).toBe(true);
  });

  it("aceita um arquivo legado da versão 1.0, sem description/createdAt de tag", () => {
    const legacyFile = {
      version: "1.0",
      exportedAt: "2026-08-16T12:00:00+00:00",
      tags: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Dev",
          colorToken: "lime",
          parentId: null,
        },
      ],
      items: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          type: "link",
          title: "Next.js",
          url: "https://nextjs.org/",
          description: null,
          content: null,
          tagIds: ["11111111-1111-4111-8111-111111111111"],
          createdAt: "2026-08-15T00:00:00+00:00",
        },
      ],
    };
    expect(backupFileSchema.safeParse(legacyFile).success).toBe(true);
  });

  it("aceita um arquivo só com tags, sem nenhum item", () => {
    const file = { ...validFile(), items: [] };
    expect(backupFileSchema.safeParse(file).success).toBe(true);
  });

  it("aceita um arquivo completamente vazio (sem tags e sem itens)", () => {
    const file = { ...validFile(), tags: [], items: [] };
    expect(backupFileSchema.safeParse(file).success).toBe(true);
  });

  it("rejeita versão desconhecida", () => {
    const file = { ...validFile(), version: "2.0" };
    expect(backupFileSchema.safeParse(file).success).toBe(false);
  });

  it("rejeita item que referencia tag inexistente", () => {
    const file = validFile();
    file.items[0]!.tagIds = ["99999999-9999-4999-8999-999999999999"];
    expect(backupFileSchema.safeParse(file).success).toBe(false);
  });

  it("rejeita hierarquia de tag apontando para pai inexistente", () => {
    const file = validFile();
    file.tags[1]!.parentId = "99999999-9999-4999-8999-999999999999";
    expect(backupFileSchema.safeParse(file).success).toBe(false);
  });

  it("rejeita tag que é pai de si mesma", () => {
    const file = validFile();
    file.tags[1]!.parentId = file.tags[1]!.id;
    expect(backupFileSchema.safeParse(file).success).toBe(false);
  });

  it("rejeita URL com scheme não http/https", () => {
    const file = validFile();
    file.items[0]!.url = "javascript:alert(1)";
    expect(backupFileSchema.safeParse(file).success).toBe(false);
  });

  it("rejeita título acima de 240 caracteres", () => {
    const file = validFile();
    file.items[0]!.title = "a".repeat(241);
    expect(backupFileSchema.safeParse(file).success).toBe(false);
  });

  it("rejeita cor de tag fora da paleta", () => {
    const file = validFile();
    // Deliberadamente impossível de virar um token válido: "chartreuse" já
    // foi usado aqui e entrou na paleta depois, quebrando o teste.
    file.tags[0]!.colorToken = "not-a-color";
    expect(backupFileSchema.safeParse(file).success).toBe(false);
  });

  it("rejeita ids de tag repetidos", () => {
    const file = validFile();
    file.tags[1]!.id = file.tags[0]!.id;
    expect(backupFileSchema.safeParse(file).success).toBe(false);
  });
  it("aceita code_component com ou sem URL no arquivo", () => {
    const fileWithCode = {
      ...validFile(),
      items: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          type: "code_component" as const,
          title: "Button Component",
          url: "https://example.com/button",
          description: null,
          content: "export const Button = () => null;",
          tagIds: ["11111111-1111-4111-8111-111111111111"],
          createdAt: "2026-08-15T00:00:00+00:00",
        },
        {
          id: "66666666-6666-4666-8666-666666666666",
          type: "code_component" as const,
          title: "Card Component",
          url: null,
          description: null,
          content: "export const Card = () => null;",
          tagIds: [],
          createdAt: "2026-08-15T00:00:00+00:00",
        },
      ],
    };
    expect(backupFileSchema.safeParse(fileWithCode).success).toBe(true);
  });

  it("rejeita code_component com URL inválida no arquivo", () => {
    const file = validFile();
    file.items = [
      {
        id: "55555555-5555-4555-8555-555555555555",
        type: "code_component",
        title: "Bad URL Component",
        url: "javascript:alert(1)",
        description: null,
        content: "export const A = 1;",
        tagIds: [],
        createdAt: "2026-08-15T00:00:00+00:00",
      },
    ];
    expect(backupFileSchema.safeParse(file).success).toBe(false);
  });

  it("rejeita code_component sem content no arquivo", () => {
    const file = validFile();
    file.items = [
      {
        id: "55555555-5555-4555-8555-555555555555",
        type: "code_component",
        title: "No Content Component",
        url: null,
        description: null,
        content: "   ",
        tagIds: [],
        createdAt: "2026-08-15T00:00:00+00:00",
      },
    ];
    expect(backupFileSchema.safeParse(file).success).toBe(false);
  });
});

describe("backupPayloadSchema", () => {
  function validPayload() {
    return {
      tags: [
        {
          key: "11111111-1111-4111-8111-111111111111",
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
          tagKeys: ["11111111-1111-4111-8111-111111111111"],
        },
      ],
    };
  }

  it("aceita um payload coerente", () => {
    expect(backupPayloadSchema.safeParse(validPayload()).success).toBe(true);
  });

  it("aceita um payload só com tags, sem nenhum item", () => {
    const payload = { ...validPayload(), items: [] };
    expect(backupPayloadSchema.safeParse(payload).success).toBe(true);
  });

  it("aceita um payload completamente vazio (sem tags e sem itens)", () => {
    const payload = { tags: [], items: [] };
    expect(backupPayloadSchema.safeParse(payload).success).toBe(true);
  });

  it("rejeita link com URL inválida", () => {
    const payload = validPayload();
    payload.items[0]!.url = "ftp://invalid-scheme.org";
    expect(backupPayloadSchema.safeParse(payload).success).toBe(false);
  });

  it("rejeita item cuja tag não veio no mesmo payload", () => {
    const payload = validPayload();
    payload.items[0]!.tagKeys = ["99999999-9999-4999-8999-999999999999"];
    expect(backupPayloadSchema.safeParse(payload).success).toBe(false);
  });

  it("rejeita prompt com url preenchida", () => {
    const payload = validPayload();
    const invalid = {
      ...payload,
      items: [
        {
          type: "prompt",
          title: "X",
          url: "https://exemplo.com/",
          content: "conteúdo",
          description: null,
          createdAt: "2026-08-15T00:00:00+00:00",
          tagKeys: [],
        },
      ],
    };
    expect(backupPayloadSchema.safeParse(invalid).success).toBe(false);
  });

  it("aceita code_component no payload", () => {
    const payload = {
      ...validPayload(),
      items: [
        {
          type: "code_component" as const,
          title: "Button Component",
          url: "https://example.com/button",
          content: "export const Button = () => null;",
          description: null,
          createdAt: "2026-08-15T00:00:00+00:00",
          tagKeys: ["11111111-1111-4111-8111-111111111111"],
        },
      ],
    };
    expect(backupPayloadSchema.safeParse(payload).success).toBe(true);
  });

  it("rejeita code_component com URL inválida no payload", () => {
    const payload = {
      ...validPayload(),
      items: [
        {
          type: "code_component" as const,
          title: "Bad URL Component",
          url: "javascript:alert(1)",
          content: "export const Button = () => null;",
          description: null,
          createdAt: "2026-08-15T00:00:00+00:00",
          tagKeys: [],
        },
      ],
    };
    expect(backupPayloadSchema.safeParse(payload).success).toBe(false);
  });
});
