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
import { extractHeadMetadata } from "@/lib/metadata/html";

const baseUrl = new URL("https://example.com/articles/one");

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
