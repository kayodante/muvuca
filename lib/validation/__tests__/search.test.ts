import { describe, expect, it } from "vitest";

import {
  encodeSearchCursor,
  librarySearchParamsSchema,
  parseLibrarySearchParams,
  parseSearchCursor,
} from "@/lib/validation/search";

const id = "11111111-1111-4111-8111-111111111111";

describe("library search validation", () => {
  it("accepts only the MVP filters and sorts", () => {
    expect(
      librarySearchParamsSchema.safeParse({
        q: "  docs  ",
        tag: id,
        type: "link",
        sort: "title_asc",
      }).success,
    ).toBe(true);
    expect(librarySearchParamsSchema.safeParse({ type: "video" }).success).toBe(
      false,
    );
  });

  it("accepts the import=1 flag and rejects other values", () => {
    expect(librarySearchParamsSchema.safeParse({ import: "1" }).success).toBe(
      true,
    );
    expect(
      librarySearchParamsSchema.safeParse({ import: "true" }).success,
    ).toBe(false);
  });

  it("strips unknown query parameters silently without failing validation", () => {
    const result = librarySearchParamsSchema.safeParse({
      q: "  docs  ",
      tag: id,
      type: "link",
      sort: "title_asc",
      utm_source: "newsletter",
      utm_medium: "email",
      ref: "twitter",
      fbclid: "123456",
      unknown_param: "extra_value",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        q: "docs",
        tag: id,
        type: "link",
        sort: "title_asc",
      });
      expect(
        (result.data as Record<string, unknown>).utm_source,
      ).toBeUndefined();
      expect((result.data as Record<string, unknown>).ref).toBeUndefined();
      expect((result.data as Record<string, unknown>).fbclid).toBeUndefined();
    }
  });

  it("keeps valid cursors tied to their active sort", () => {
    const cursor = encodeSearchCursor({
      sort: "newest",
      timestamp: "2026-08-13T12:00:00.000Z",
      id,
    });

    expect(parseSearchCursor(cursor, "newest")).not.toBeNull();
    expect(parseSearchCursor(cursor, "oldest")).toBeNull();
    expect(parseSearchCursor("not-a-cursor", "newest")).toBeNull();
  });

  it("encodes and decodes cursor direction (next/prev)", () => {
    const nextCursor = encodeSearchCursor({
      sort: "newest",
      timestamp: "2026-08-13T12:00:00.000Z",
      id,
      dir: "next",
    });
    const prevCursor = encodeSearchCursor({
      sort: "newest",
      timestamp: "2026-08-13T12:00:00.000Z",
      id,
      dir: "prev",
    });

    const parsedNext = parseSearchCursor(nextCursor, "newest");
    const parsedPrev = parseSearchCursor(prevCursor, "newest");

    expect(parsedNext).toEqual({
      sort: "newest",
      timestamp: "2026-08-13T12:00:00.000Z",
      id,
      dir: "next",
    });
    expect(parsedPrev).toEqual({
      sort: "newest",
      timestamp: "2026-08-13T12:00:00.000Z",
      id,
      dir: "prev",
    });
  });

  it("supports direction parameter in searchCursorForItem", async () => {
    const { searchCursorForItem } = await import("@/lib/validation/search");
    const item = {
      id,
      title: "Alpha Document",
      createdAt: "2026-08-13T12:00:00.000Z",
      updatedAt: "2026-08-14T12:00:00.000Z",
    };

    const cursorPrev = searchCursorForItem(item, "newest", "prev");
    expect(parseSearchCursor(cursorPrev, "newest")?.dir).toBe("prev");

    const titlePrev = searchCursorForItem(item, "title_asc", "prev");
    expect(parseSearchCursor(titlePrev, "title_asc")?.dir).toBe("prev");

    const defaultNext = searchCursorForItem(item, "updated");
    expect(parseSearchCursor(defaultNext, "updated")?.dir).toBe("next");
  });
});

describe("parseLibrarySearchParams graceful degradation", () => {
  it("retorna objeto vazio para entradas nulas, indefinidas ou não-objeto", () => {
    expect(parseLibrarySearchParams(undefined)).toEqual({});
    expect(parseLibrarySearchParams(null)).toEqual({});
    expect(parseLibrarySearchParams("string")).toEqual({});
    expect(parseLibrarySearchParams(123)).toEqual({});
  });

  it("aceita parâmetros válidos e normaliza query com trim", () => {
    const result = parseLibrarySearchParams({
      q: "  nextjs docs  ",
      tag: id,
      type: "link",
      sort: "title_asc",
      cursor: "valid-cursor-token",
      create: "1",
      import: "1",
    });

    expect(result).toEqual({
      q: "nextjs docs",
      tag: id,
      type: "link",
      sort: "title_asc",
      cursor: "valid-cursor-token",
      create: "1",
      import: "1",
    });
  });

  it("descarta parâmetros desconhecidos sem falhar (strip)", () => {
    const result = parseLibrarySearchParams({
      q: "react",
      utm_source: "newsletter",
      utm_medium: "email",
      ref: "twitter",
      fbclid: "987654",
      custom_param: "value",
    });

    expect(result).toEqual({
      q: "react",
    });
    expect((result as Record<string, unknown>).utm_source).toBeUndefined();
    expect((result as Record<string, unknown>).custom_param).toBeUndefined();
  });

  it("degrada graciosamente valores inválidos de sort para undefined", () => {
    expect(parseLibrarySearchParams({ sort: "alpha" })).toEqual({});
    expect(parseLibrarySearchParams({ sort: "invalid_sort" })).toEqual({});
    expect(parseLibrarySearchParams({ sort: 123 })).toEqual({});
  });

  it("degrada graciosamente valores inválidos de type para undefined", () => {
    expect(parseLibrarySearchParams({ type: "video" })).toEqual({});
    expect(parseLibrarySearchParams({ type: "audio" })).toEqual({});
    expect(parseLibrarySearchParams({ type: "invalid" })).toEqual({});
  });

  it("degrada graciosamente tag que não seja UUID para undefined", () => {
    expect(parseLibrarySearchParams({ tag: "not-a-uuid" })).toEqual({});
    expect(parseLibrarySearchParams({ tag: "123" })).toEqual({});
  });

  it("desempacota arrays de query do Next.js pegando o primeiro valor", () => {
    const result = parseLibrarySearchParams({
      sort: ["title_desc", "newest"],
      q: ["pesquisa", "outra"],
      type: ["prompt", "link"],
      tag: [id, "22222222-2222-4222-8222-222222222222"],
    });

    expect(result).toEqual({
      sort: "title_desc",
      q: "pesquisa",
      type: "prompt",
      tag: id,
    });
  });

  it("trunca queries de busca com mais de 240 caracteres", () => {
    const longQuery = "a".repeat(300);
    const result = parseLibrarySearchParams({ q: longQuery });
    expect(result.q).toHaveLength(240);
    expect(result.q).toBe("a".repeat(240));
  });

  it("ignora query vazia ou apenas com espaços em branco", () => {
    expect(parseLibrarySearchParams({ q: "" })).toEqual({});
    expect(parseLibrarySearchParams({ q: "     " })).toEqual({});
  });

  it("degrada valores inválidos de create e import para undefined", () => {
    expect(parseLibrarySearchParams({ create: "true" })).toEqual({});
    expect(parseLibrarySearchParams({ create: "yes" })).toEqual({});
    expect(parseLibrarySearchParams({ import: "0" })).toEqual({});
    expect(parseLibrarySearchParams({ import: "false" })).toEqual({});
  });
});
