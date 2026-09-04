import { describe, expect, it } from "vitest";

import duplicateFoldersHtml from "@/lib/bookmarks/__fixtures__/duplicate-folders.html?raw";
import invalidHtml from "@/lib/bookmarks/__fixtures__/invalid.html?raw";
import malformedHtml from "@/lib/bookmarks/__fixtures__/malformed.html?raw";
import validHtml from "@/lib/bookmarks/__fixtures__/valid.html?raw";
import {
  MAX_BOOKMARK_FILE_SIZE,
  parseBookmarkHtml,
  validateBookmarkFile,
} from "@/lib/bookmarks/parser";

describe("bookmark parser", () => {
  it("preserves valid folders as a tag hierarchy and links as items", () => {
    const result = parseBookmarkHtml(validHtml);

    expect(result.tags).toEqual([
      { key: "tag_1", parentKey: null, name: "Trabalho" },
      {
        key: "tag_2",
        parentKey: "tag_1",
        name: "Referências",
      },
    ]);
    expect(result.items).toEqual([
      {
        title: "Documentação",
        url: "HTTPS://Example.com:443/docs",
        normalizedUrl: "https://example.com/docs",
        tagKey: "tag_2",
      },
      {
        title: "Muvuca",
        url: "https://muvuca.app",
        normalizedUrl: "https://muvuca.app/",
        tagKey: "tag_1",
      },
      {
        title: "Link na raiz",
        url: "https://root.example",
        normalizedUrl: "https://root.example/",
        tagKey: null,
      },
    ]);
    expect(result.invalidCount).toBe(0);
    expect(result.duplicateCount).toBe(0);
  });

  it("keeps the same URL once per folder so the import can tag it twice", () => {
    const result = parseBookmarkHtml(duplicateFoldersHtml);

    expect(result.tags.map((tag) => tag.name)).toEqual([
      "Trabalho",
      "Pesquisa",
    ]);
    expect(
      result.items.map((item) => ({
        normalizedUrl: item.normalizedUrl,
        tagKey: item.tagKey,
      })),
    ).toEqual([
      { normalizedUrl: "https://a.example/docs", tagKey: "tag_1" },
      { normalizedUrl: "https://a.example/docs", tagKey: "tag_2" },
    ]);
    expect(result.duplicateCount).toBe(1);
    expect(result.invalidCount).toBe(0);
  });

  it("ignores invalid links without executing their markup", () => {
    const result = parseBookmarkHtml(invalidHtml);

    expect(result.items).toEqual([]);
    expect(result.invalidCount).toBe(3);
  });

  it("recovers links and folders from malformed bookmark HTML", () => {
    const result = parseBookmarkHtml(malformedHtml);

    expect(result.tags.map((tag) => tag.name)).toEqual([
      "Primeira pasta",
      "Segunda pasta",
    ]);
    expect(result.items.map((item) => item.normalizedUrl)).toEqual([
      "https://one.example/",
      "https://two.example/",
    ]);
  });

  it("truncates a link title longer than the item title limit", () => {
    const longTitle = "T".repeat(300);
    const html = `<DL><p><DT><A HREF="https://example.com/page">${longTitle}</A></DL><p>`;

    const result = parseBookmarkHtml(html);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.title).toHaveLength(240);
    expect(result.items[0]?.title).toBe("T".repeat(240));
    expect(result.invalidCount).toBe(0);
  });

  it("truncates a folder name longer than the tag name limit", () => {
    const longName = "F".repeat(120);
    const html = `<DL><p><DT><H3>${longName}</H3><DL><p><DT><A HREF="https://example.com">Item</A></DL><p></DL><p>`;

    const result = parseBookmarkHtml(html);

    expect(result.tags).toHaveLength(1);
    expect(result.tags[0]?.name).toHaveLength(80);
    expect(result.tags[0]?.name).toBe("F".repeat(80));
  });

  it("drops a link whose URL exceeds the URL length limit instead of truncating it", () => {
    const longPath = "a".repeat(4090);
    const html = `<DL><p><DT><A HREF="https://example.com/${longPath}">Item</A></DL><p>`;

    const result = parseBookmarkHtml(html);

    expect(result.items).toEqual([]);
    expect(result.invalidCount).toBe(1);
  });

  it("drops a lone high surrogate left by truncating a title mid-emoji", () => {
    const title = "T".repeat(239) + "\u{1F600}" + "resto";
    const html = `<DL><p><DT><A HREF="https://example.com/page">${title}</A></DL><p>`;

    const result = parseBookmarkHtml(html);

    expect(result.items).toHaveLength(1);
    const parsedTitle = result.items[0]?.title ?? "";
    expect(parsedTitle).toBe("T".repeat(239));
    expect(parsedTitle.length).toBeLessThanOrEqual(240);
    expect(parsedTitle).not.toMatch(/[\uD800-\uDBFF]$/);
  });

  it("drops a lone high surrogate left by truncating a folder name mid-emoji", () => {
    const name = "F".repeat(79) + "\u{1F600}" + "resto";
    const html = `<DL><p><DT><H3>${name}</H3><DL><p><DT><A HREF="https://example.com">Item</A></DL><p></DL><p>`;

    const result = parseBookmarkHtml(html);

    expect(result.tags).toHaveLength(1);
    const parsedName = result.tags[0]?.name ?? "";
    expect(parsedName).toBe("F".repeat(79));
    expect(parsedName.length).toBeLessThanOrEqual(80);
    expect(parsedName).not.toMatch(/[\uD800-\uDBFF]$/);
  });

  it("rejects files larger than the import limit", () => {
    const file = new File(
      [new Uint8Array(MAX_BOOKMARK_FILE_SIZE + 1)],
      "x.html",
      {
        type: "text/html",
      },
    );

    expect(validateBookmarkFile(file)).toEqual({
      ok: false,
      message: "O arquivo deve ter no máximo 10 MB.",
    });
  });
});
