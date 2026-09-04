/**
 * Textual `<head>` metadata extractor. No DOM, no `jsdom`, no headless
 * browser, no new dependency (CLAUDE.md §14/§20, plan §7.10) — plain
 * regex over a bounded slice of the document. `lib/bookmarks/parser.ts`
 * uses `DOMParser` for its browser-only import flow; this module runs
 * server-side (Task 3) where there is no DOM, and the security model here
 * is different: we only ever read a handful of known attribute values out
 * of `<meta>`/`<link>`/`<title>`, we never execute or re-render any of the
 * markup, so a full parser would buy nothing.
 *
 * The extracted HTML buffer/string never leaves this function (CLAUDE.md
 * §14 item 11): callers only ever see the small sanitized `HeadMetadata`
 * fields below.
 */

export type HeadMetadata = {
  title: string | null;
  description: string | null;
  siteName: string | null;
  imageUrl: string | null;
  imageSource: "og_image" | "twitter_image" | "none";
  iconUrl: string | null;
};

/** Hard cap on how much of the document we ever look at — protects against a pathological or hostile huge `<head>` (plan §7.8/§7.10). */
const MAX_HTML_CHARS = 512 * 1024;

const TITLE_MAX_LENGTH = 240;
const DESCRIPTION_MAX_LENGTH = 500;
const SITE_NAME_MAX_LENGTH = 120;

const ICON_RELS = new Set(["icon", "shortcut icon", "apple-touch-icon"]);

export function extractHeadMetadata(html: string, baseUrl: URL): HeadMetadata {
  const truncated =
    html.length > MAX_HTML_CHARS ? html.slice(0, MAX_HTML_CHARS) : html;
  const headMatch = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(truncated);
  const source = headMatch ? (headMatch[1] ?? "") : truncated;

  const metaByKey = collectMetaTags(source);
  const linkTags = findTags(source, "link").map(parseAttributes);

  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(source);
  const rawTitle =
    metaByKey.get("og:title") ??
    (titleMatch ? decodeEntities(titleMatch[1] ?? "") : null);
  const rawDescription =
    metaByKey.get("og:description") ?? metaByKey.get("description") ?? null;
  const rawSiteName = metaByKey.get("og:site_name") ?? null;

  const { imageUrl, imageSource } = resolveImage(metaByKey, baseUrl);
  const iconUrl = selectIcon(linkTags, baseUrl);

  return {
    title: sanitizeText(rawTitle, TITLE_MAX_LENGTH),
    description: sanitizeText(rawDescription, DESCRIPTION_MAX_LENGTH),
    siteName: sanitizeText(rawSiteName, SITE_NAME_MAX_LENGTH),
    imageUrl,
    imageSource,
    iconUrl,
  };
}

function collectMetaTags(source: string): Map<string, string> {
  const metaByKey = new Map<string, string>();
  for (const attrs of findTags(source, "meta").map(parseAttributes)) {
    const key = (attrs.property ?? attrs.name ?? "").toLowerCase();
    if (key && attrs.content !== undefined && !metaByKey.has(key)) {
      metaByKey.set(key, attrs.content);
    }
  }
  return metaByKey;
}

function resolveImage(
  metaByKey: Map<string, string>,
  baseUrl: URL,
): { imageUrl: string | null; imageSource: HeadMetadata["imageSource"] } {
  const ogCandidate =
    metaByKey.get("og:image:secure_url") ?? metaByKey.get("og:image");
  const ogResolved = ogCandidate ? resolveHttpUrl(ogCandidate, baseUrl) : null;
  if (ogResolved) {
    return { imageUrl: ogResolved, imageSource: "og_image" };
  }

  const twitterCandidate =
    metaByKey.get("twitter:image") ?? metaByKey.get("twitter:image:src");
  const twitterResolved = twitterCandidate
    ? resolveHttpUrl(twitterCandidate, baseUrl)
    : null;
  if (twitterResolved) {
    return { imageUrl: twitterResolved, imageSource: "twitter_image" };
  }

  return { imageUrl: null, imageSource: "none" };
}

function selectIcon(
  linkTags: Array<Record<string, string>>,
  baseUrl: URL,
): string | null {
  let best: { url: string; score: number } | null = null;

  for (const attrs of linkTags) {
    const rel = (attrs.rel ?? "").trim().toLowerCase();
    if (!ICON_RELS.has(rel)) continue;

    const href = attrs.href;
    if (!href) continue;
    const trimmedHref = href.trim();
    if (
      /\.ico$/i.test(trimmedHref) ||
      /\.svg(\?.*)?$/i.test(trimmedHref) ||
      /^data:/i.test(trimmedHref)
    ) {
      continue;
    }

    const resolved = resolveHttpUrl(trimmedHref, baseUrl);
    if (!resolved) continue;

    const score = parseSizeScore(attrs.sizes);
    if (!best || score > best.score) {
      best = { url: resolved, score };
    }
  }

  return best?.url ?? null;
}

function parseSizeScore(sizes: string | undefined): number {
  if (!sizes) return 0;
  const trimmed = sizes.trim().toLowerCase();
  if (trimmed === "any") return Number.MAX_SAFE_INTEGER;
  const match = /(\d+)x(\d+)/i.exec(trimmed);
  if (!match) return 0;
  return Number(match[1]);
}

/** Resolves `candidate` (absolute, root-relative, or protocol-relative) against `baseUrl`; only ever returns an `http:`/`https:` result (CLAUDE.md §15 — never `javascript:`/`data:` as a link URL). */
function resolveHttpUrl(candidate: string, baseUrl: URL): string | null {
  const trimmed = candidate.trim();
  if (!trimmed) return null;
  try {
    const resolved = new URL(trimmed, baseUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:")
      return null;
    return resolved.href;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------
// Minimal tag/attribute scanning. Deliberately not a full HTML tokenizer:
// we only ever need a handful of well-known attributes off `<meta>` and
// `<link>` tags, and malformed markup must degrade to "extract less",
// never throw (plan's `malformed.html` fixture).
// ---------------------------------------------------------------------

function findTags(source: string, tagName: string): string[] {
  const regex = new RegExp(`<${tagName}\\b[^>]*>`, "gi");
  return source.match(regex) ?? [];
}

const ATTRIBUTE_PATTERN =
  /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

function parseAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  ATTRIBUTE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ATTRIBUTE_PATTERN.exec(tag)) !== null) {
    const name = match[1]?.toLowerCase();
    if (!name) continue;
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    attrs[name] = decodeEntities(value);
  }
  return attrs;
}

// ---------------------------------------------------------------------
// Entity decoding: only the common named entities plus numeric
// (decimal/hex) references. Decoding `&lt;script&gt;` yields the literal
// text "<script>" as JS string DATA — it is never re-parsed as markup by
// this module or (per CLAUDE.md §15) by any renderer downstream.
// ---------------------------------------------------------------------

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

const ENTITY_PATTERN = /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g;

function decodeEntities(value: string): string {
  return value.replace(ENTITY_PATTERN, (match, entity: string) => {
    if (entity.startsWith("#")) {
      const isHex = entity[1] === "x" || entity[1] === "X";
      const codePoint = isHex
        ? parseInt(entity.slice(2), 16)
        : parseInt(entity.slice(1), 10);
      if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff)
        return match;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

// ---------------------------------------------------------------------
// String sanitization (plan §7.13): strip control characters, collapse
// whitespace, trim, then truncate by UTF-16 code unit — same technique as
// `lib/bookmarks/parser.ts`'s `truncateAtCodeUnit`, so a truncation can
// never split a surrogate pair (and thus never produce an invalid string
// or exceed the matching Zod `.max()` limit applied downstream in PR 3).
// ---------------------------------------------------------------------

const CONTROL_CHARS_PATTERN = /[ --]/g;

function stripControlChars(value: string): string {
  return value.replace(CONTROL_CHARS_PATTERN, "");
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ");
}

function truncateAtCodeUnit(value: string, maxLength: number): string {
  let sliced = value.slice(0, maxLength);
  if (/[\uD800-\uDBFF]$/.test(sliced)) sliced = sliced.slice(0, -1);
  return sliced;
}

function sanitizeText(raw: string | null, maxLength: number): string | null {
  if (raw === null) return null;
  const cleaned = collapseWhitespace(stripControlChars(raw)).trim();
  if (!cleaned) return null;
  return truncateAtCodeUnit(cleaned, maxLength);
}
