import type { TagColorToken } from "@/lib/validation/tag";

/**
 * Full literal class names, not a template-built string: Tailwind's
 * scanner only picks up class names it can see spelled out in source, so
 * `bg-tag-${token}` would silently produce no utility at build time.
 */
export const TAG_SWATCH_CLASS: Record<TagColorToken, string> = {
  lime: "bg-tag-lime",
  chartreuse: "bg-tag-chartreuse",
  yellow: "bg-tag-yellow",
  amber: "bg-tag-amber",
  orange: "bg-tag-orange",
  peach: "bg-tag-peach",
  terracotta: "bg-tag-terracotta",
  brown: "bg-tag-brown",
  red: "bg-tag-red",
  rose: "bg-tag-rose",
  coral: "bg-tag-coral",
  pink: "bg-tag-pink",
  fuchsia: "bg-tag-fuchsia",
  purple: "bg-tag-purple",
  lavender: "bg-tag-lavender",
  violet: "bg-tag-violet",
  indigo: "bg-tag-indigo",
  periwinkle: "bg-tag-periwinkle",
  blue: "bg-tag-blue",
  sky: "bg-tag-sky",
  cyan: "bg-tag-cyan",
  aqua: "bg-tag-aqua",
  teal: "bg-tag-teal",
  emerald: "bg-tag-emerald",
  mint: "bg-tag-mint",
  green: "bg-tag-green",
  slate: "bg-tag-slate",
  zinc: "bg-tag-zinc",
  stone: "bg-tag-stone",
};

// Nomes de cor exibidos ao usuário (tooltip + accessible name do seletor)
// vivem em `t.tags.colors` (lib/i18n/dictionaries) -- não aqui, para
// seguirem o idioma da interface.

/**
 * Looks up a swatch class from a `color_token` value read back from the
 * database (typed as plain `string`, since the guarantee that it is one of
 * `TAG_COLOR_TOKENS` is a Postgres `check` constraint, not something
 * TypeScript can see). Falls back to `stone` instead of asserting the type,
 * so a value the constraint should have rejected still renders instead of
 * crashing.
 */
export function swatchClassFor(colorToken: string): string {
  return (
    TAG_SWATCH_CLASS[colorToken as TagColorToken] ?? TAG_SWATCH_CLASS.stone
  );
}

/**
 * Which text color reads at >=4.5:1 (WCAG AA, small text) against each
 * swatch's fixed hex from `app/globals.css` (`--tag-*` does not retheme
 * between light/dark, so this pairing is a static fact, not a runtime
 * computation). Computed once via the standard relative-luminance formula;
 * only needs revisiting if a swatch hex changes. Used for text placed
 * directly on a full-opacity swatch (e.g. `SiteIdentity`'s monogram).
 */
const TAG_SWATCH_TEXT_CLASS: Record<
  TagColorToken,
  "text-white" | "text-black"
> = {
  lime: "text-black",
  chartreuse: "text-black",
  yellow: "text-black",
  amber: "text-black",
  orange: "text-black",
  peach: "text-black",
  terracotta: "text-white",
  brown: "text-white",
  red: "text-black",
  rose: "text-black",
  coral: "text-black",
  pink: "text-black",
  fuchsia: "text-black",
  purple: "text-black",
  lavender: "text-black",
  violet: "text-black",
  indigo: "text-black",
  periwinkle: "text-black",
  blue: "text-black",
  sky: "text-black",
  cyan: "text-black",
  aqua: "text-black",
  teal: "text-black",
  emerald: "text-black",
  mint: "text-black",
  green: "text-black",
  slate: "text-white",
  zinc: "text-white",
  stone: "text-white",
};

/** Same boundary trade-off as `swatchClassFor`. */
export function swatchTextClassFor(
  colorToken: string,
): "text-white" | "text-black" {
  return (
    TAG_SWATCH_TEXT_CLASS[colorToken as TagColorToken] ??
    TAG_SWATCH_TEXT_CLASS.stone
  );
}
