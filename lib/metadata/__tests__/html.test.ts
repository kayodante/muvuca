import { describe, expect, it } from "vitest";

import controlCharsHtml from "@/lib/metadata/__fixtures__/control-chars.html?raw";
import entitiesHtml from "@/lib/metadata/__fixtures__/entities.html?raw";
import faviconVariantsHtml from "@/lib/metadata/__fixtures__/favicon-variants.html?raw";
import hugeHeadHtml from "@/lib/metadata/__fixtures__/huge-head.html?raw";
import malformedHtml from "@/lib/metadata/__fixtures__/malformed.html?raw";
import noMetadataHtml from "@/lib/metadata/__fixtures__/no-metadata.html?raw";
import ogCompleteHtml from "@/lib/metadata/__fixtures__/og-complete.html?raw";
import ogSecureUrlHtml from "@/lib/metadata/__fixtures__/og-secure-url.html?raw";
import protocolRelativeHtml from "@/lib/metadata/__fixtures__/protocol-relative.html?raw";
import relativeUrlsHtml from "@/lib/metadata/__fixtures__/relative-urls.html?raw";
import titleOnlyHtml from "@/lib/metadata/__fixtures__/title-only.html?raw";
import twitterOnlyHtml from "@/lib/metadata/__fixtures__/twitter-only.html?raw";
import { decodeHtmlDocument, extractHeadMetadata } from "@/lib/metadata/html";

const baseUrl = new URL("https://example.com/articles/one");

describe("metadata text decoding", () => {
  it.each([
    ['text/html; charset="iso-8859-1"', ""],
    ["text/html", '<meta charset="windows-1252">'],
    [
      "text/html",
      '<meta content="text/html; charset=iso-8859-1" http-equiv="Content-Type">',
    ],
    ["text/html; charset=unknown-encoding", '<meta charset="windows-1252">'],
  ])("reads accented text from %s / %s", (contentType, declaration) => {
    const body = Buffer.from(
      `<head>${declaration}<title>Calça e acessórios</title></head>`,
      "latin1",
    );
    expect(
      extractHeadMetadata(decodeHtmlDocument(body, contentType), baseUrl).title,
    ).toBe("Calça e acessórios");
  });

  it("prefers an HTTP charset over a conflicting meta declaration", () => {
    const body = Buffer.from(
      '<head><meta charset="utf-8"><title>Calça</title></head>',
      "latin1",
    );
    expect(
      decodeHtmlDocument(body, "text/html; charset=windows-1252"),
    ).toContain("Calça");
  });

  it.each(["utf-8", "utf-16le"] as const)(
    "prefers a %s BOM over declarations",
    (encoding) => {
      const body = Buffer.from(
        '\uFEFF<head><meta charset="windows-1252"><title>Ação</title></head>',
        encoding,
      );
      expect(
        decodeHtmlDocument(body, "text/html; charset=iso-8859-1"),
      ).toContain("Ação");
    },
  );

  it("defaults to UTF-8 for unknown labels and ignores commented or late declarations", () => {
    const body = Buffer.from(
      '<head><!-- <meta charset="windows-1252"> -->' +
        " ".repeat(1024) +
        '<meta charset="windows-1252"><title>Ação</title></head>',
    );
    expect(
      decodeHtmlDocument(body, "text/html; charset=unknown-encoding"),
    ).toContain("Ação");
  });

  it("decodes HTML entities once, preserving case and keeping markup as plain text", () => {
    const result = extractHeadMetadata(
      '<head><title>&Aacute;rvore &ndash; a&ccedil;&atilde;o</title><meta name="description" content="world&rsquo;s Vestu&aacute;rio &amp;lt;b&amp;gt; &lt;script&gt;alert(1)&lt;/script&gt;"></head>',
      baseUrl,
    );
    expect(result.title).toBe("Árvore – ação");
    expect(result.description).toBe(
      "world’s Vestuário &lt;b&gt; <script>alert(1)</script>",
    );
  });

  it("still rejects encoded non-HTTP image schemes and preserves ambiguous URL ampersands", () => {
    const result = extractHeadMetadata(
      '<head><meta property="og:image" content="javascript&colon;alert(1)"><link rel="icon" href="/icon.png?x=1&copy=2&amp;y=3"></head>',
      baseUrl,
    );
    expect(result.imageUrl).toBeNull();
    expect(result.iconUrl).toBe("https://example.com/icon.png?x=1&copy=2&y=3");
  });
});

describe("extractHeadMetadata", () => {
  it("extracts og:title, og:description, og:image and og:site_name", () => {
    const result = extractHeadMetadata(ogCompleteHtml, baseUrl);

    expect(result.title).toBe("Título Completo");
    expect(result.description).toBe("Uma descrição completa da página.");
    expect(result.siteName).toBe("Example Site");
    expect(result.imageUrl).toBe("https://example.com/img/complete.png");
    expect(result.imageSource).toBe("og_image");
  });

  it("prefers og:image:secure_url over og:image", () => {
    const result = extractHeadMetadata(ogSecureUrlHtml, baseUrl);

    expect(result.imageUrl).toBe("https://example.com/img/secure.png");
    expect(result.imageSource).toBe("og_image");
  });

  it("falls back to twitter:image when there is no og:image", () => {
    const result = extractHeadMetadata(twitterOnlyHtml, baseUrl);

    expect(result.imageUrl).toBe("https://example.com/img/twitter.png");
    expect(result.imageSource).toBe("twitter_image");
  });

  it("resolves a relative og:image against the given baseUrl", () => {
    const result = extractHeadMetadata(relativeUrlsHtml, baseUrl);

    expect(result.imageUrl).toBe("https://example.com/img/a.png");
  });

  it("resolves a protocol-relative image URL using baseUrl's scheme", () => {
    const result = extractHeadMetadata(protocolRelativeHtml, baseUrl);

    expect(result.imageUrl).toBe("https://cdn.example.com/y.png");
  });

  it("returns every field null and imageSource none for a page with no metadata", () => {
    const result = extractHeadMetadata(noMetadataHtml, baseUrl);

    expect(result.title).toBeNull();
    expect(result.description).toBeNull();
    expect(result.siteName).toBeNull();
    expect(result.imageUrl).toBeNull();
    expect(result.imageSource).toBe("none");
    expect(result.iconUrl).toBeNull();
  });

  it("falls back to <title> and meta[name=description] when there is no OG data", () => {
    const result = extractHeadMetadata(titleOnlyHtml, baseUrl);

    expect(result.title).toBe("Só Título");
    expect(result.description).toBe("Descrição via meta name.");
  });

  it("picks the icon with the largest sizes, ignoring .ico/.svg/data:", () => {
    const result = extractHeadMetadata(faviconVariantsHtml, baseUrl);

    expect(result.iconUrl).toBe("https://example.com/icon-180.png");
  });

  it("never throws on malformed markup and extracts what it can", () => {
    expect(() => extractHeadMetadata(malformedHtml, baseUrl)).not.toThrow();
    const result = extractHeadMetadata(malformedHtml, baseUrl);
    expect(result.title).toBe("Malformed Ok");
  });

  it("caps parsing at the 512KB head limit and does not hang", () => {
    const start = Date.now();
    const result = extractHeadMetadata(hugeHeadHtml, baseUrl);
    const elapsedMs = Date.now() - start;

    expect(elapsedMs).toBeLessThan(2000);
    expect(result.title).toBe("Huge Head");
    // A field placed well past the 512KB cutoff must never be reached.
    expect(result.title).not.toBe("Depois do teto");
  });

  it("decodes named and numeric entities but keeps escaped markup as literal text", () => {
    const result = extractHeadMetadata(entitiesHtml, baseUrl);

    expect(result.title).toBe("Rock & Roll");
    expect(result.description).toContain(`'oi'`);
    expect(result.description).toContain('"seguro"');
    expect(result.description).toContain("<script>alert(1)</script>");
    expect(typeof result.description).toBe("string");
  });

  it("removes control characters and collapses CRLF during normalization", () => {
    const result = extractHeadMetadata(controlCharsHtml, baseUrl);

    expect(result.title).toBe("TitleWithControl");
    expect(result.description).toBe("Linha um Linha dois com controle");
  });

  it("strips exactly C0 controls except tab/LF/CR, plus DEL", () => {
    const whitespace = new Set([0x09, 0x0a, 0x0d]);
    for (const codePoint of [...Array(0x21).keys(), 0x7f, 0x80]) {
      const char = String.fromCodePoint(codePoint);
      const html = `<head><meta property="og:title" content="a${char}b" /></head>`;
      const expected = whitespace.has(codePoint)
        ? "a b"
        : codePoint <= 0x1f || codePoint === 0x7f
          ? "ab"
          : `a${char}b`;

      expect(
        extractHeadMetadata(html, baseUrl).title,
        `U+${codePoint.toString(16)}`,
      ).toBe(expected);
    }
  });

  it("truncates title/description/siteName at their length limits without splitting a surrogate pair", () => {
    const longTitle = "T".repeat(239) + "\u{1F600}" + "resto";
    const html = `<head><meta property="og:title" content="${longTitle}" /></head>`;

    const result = extractHeadMetadata(html, baseUrl);

    expect(result.title?.length).toBeLessThanOrEqual(240);
    expect(result.title).not.toMatch(/[\uD800-\uDBFF]$/);
  });

  it("treats an unparsable image URL as absent instead of throwing", () => {
    const html = `<head><meta property="og:image" content="https://" /></head>`;

    expect(() => extractHeadMetadata(html, baseUrl)).not.toThrow();
    const result = extractHeadMetadata(html, baseUrl);
    expect(result.imageUrl).toBeNull();
    expect(result.imageSource).toBe("none");
  });
});
