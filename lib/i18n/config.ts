import { z } from "zod";

/** Supported UI locales. `pt-BR` is the product default. */
export const LOCALES = ["pt-BR", "en"] as const;

export const localeSchema = z.enum(LOCALES);

export type Locale = z.infer<typeof localeSchema>;

export const DEFAULT_LOCALE: Locale = "pt-BR";

/**
 * Mirrors the resolved locale for logged-out users and doubles as the fast
 * path for logged-in ones (read on every request, alongside the DB lookup).
 */
export const LOCALE_COOKIE = "muvuca-locale";

type AcceptLanguageTag = { tag: string; q: number };

/** Splits an `Accept-Language` header into `{tag, q}` pairs, highest q first. */
function parseAcceptLanguage(acceptLanguage: string): AcceptLanguageTag[] {
  return acceptLanguage
    .split(",")
    .map((part): AcceptLanguageTag | null => {
      const [rawTag, ...params] = part.trim().split(";");
      const tag = rawTag?.trim().toLowerCase();
      if (!tag) return null;

      const qParam = params
        .map((param) => param.trim())
        .find((param) => param.startsWith("q="));
      const q = qParam ? Number(qParam.slice(2)) : 1;

      return { tag, q: Number.isFinite(q) ? q : 1 };
    })
    .filter((entry): entry is AcceptLanguageTag => entry !== null)
    .sort((a, b) => b.q - a.q);
}

/**
 * Highest-q tag that starts with a supported language wins (`en-US` and
 * `pt-PT` both match); every other tag is ignored, not treated as a block.
 * `null` when nothing in the header matches a supported language.
 */
function localeFromAcceptLanguage(
  acceptLanguage: string | null | undefined,
): Locale | null {
  if (!acceptLanguage) return null;

  for (const { tag } of parseAcceptLanguage(acceptLanguage)) {
    if (tag.startsWith("en")) return "en";
    if (tag.startsWith("pt")) return "pt-BR";
  }

  return null;
}

/**
 * Resolution order: saved preference (logged-in user) > cookie > browser
 * `Accept-Language` > `DEFAULT_LOCALE`. Pure and synchronous so it is
 * testable without a Next.js request context; `lib/i18n/server.ts` is the
 * only caller that gathers the three inputs from cookies/headers/DB.
 */
export function resolveLocale(input: {
  saved?: string | null;
  cookie?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  const saved = localeSchema.safeParse(input.saved);
  if (saved.success) return saved.data;

  const cookie = localeSchema.safeParse(input.cookie);
  if (cookie.success) return cookie.data;

  const fromHeader = localeFromAcceptLanguage(input.acceptLanguage);
  if (fromHeader) return fromHeader;

  return DEFAULT_LOCALE;
}
