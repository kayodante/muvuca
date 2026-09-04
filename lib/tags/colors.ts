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

/**
 * Subtle badge class pairings (background tint + matching border).
 * Used when tags need subtle highlight without becoming saturated blocks.
 */
export const TAG_BADGE_CLASS: Record<TagColorToken, string> = {
  lime: "bg-tag-lime/10 border-tag-lime/25 text-foreground",
  chartreuse: "bg-tag-chartreuse/10 border-tag-chartreuse/25 text-foreground",
  yellow: "bg-tag-yellow/10 border-tag-yellow/25 text-foreground",
  amber: "bg-tag-amber/10 border-tag-amber/25 text-foreground",
  orange: "bg-tag-orange/10 border-tag-orange/25 text-foreground",
  peach: "bg-tag-peach/10 border-tag-peach/25 text-foreground",
  terracotta: "bg-tag-terracotta/10 border-tag-terracotta/25 text-foreground",
  brown: "bg-tag-brown/10 border-tag-brown/25 text-foreground",
  red: "bg-tag-red/10 border-tag-red/25 text-foreground",
  rose: "bg-tag-rose/10 border-tag-rose/25 text-foreground",
  coral: "bg-tag-coral/10 border-tag-coral/25 text-foreground",
  pink: "bg-tag-pink/10 border-tag-pink/25 text-foreground",
  fuchsia: "bg-tag-fuchsia/10 border-tag-fuchsia/25 text-foreground",
  purple: "bg-tag-purple/10 border-tag-purple/25 text-foreground",
  lavender: "bg-tag-lavender/10 border-tag-lavender/25 text-foreground",
  violet: "bg-tag-violet/10 border-tag-violet/25 text-foreground",
  indigo: "bg-tag-indigo/10 border-tag-indigo/25 text-foreground",
  periwinkle: "bg-tag-periwinkle/10 border-tag-periwinkle/25 text-foreground",
  blue: "bg-tag-blue/10 border-tag-blue/25 text-foreground",
  sky: "bg-tag-sky/10 border-tag-sky/25 text-foreground",
  cyan: "bg-tag-cyan/10 border-tag-cyan/25 text-foreground",
  aqua: "bg-tag-aqua/10 border-tag-aqua/25 text-foreground",
  teal: "bg-tag-teal/10 border-tag-teal/25 text-foreground",
  emerald: "bg-tag-emerald/10 border-tag-emerald/25 text-foreground",
  mint: "bg-tag-mint/10 border-tag-mint/25 text-foreground",
  green: "bg-tag-green/10 border-tag-green/25 text-foreground",
  slate: "bg-tag-slate/10 border-tag-slate/25 text-foreground",
  zinc: "bg-tag-zinc/10 border-tag-zinc/25 text-foreground",
  stone: "bg-tag-stone/10 border-tag-stone/25 text-foreground",
};

export const TAG_COLOR_LABELS: Record<TagColorToken, string> = {
  lime: "Lima",
  chartreuse: "Chartreuse",
  yellow: "Amarelo",
  amber: "Âmbar",
  orange: "Laranja",
  peach: "Pêssego",
  terracotta: "Terracota",
  brown: "Marrom",
  red: "Vermelho",
  rose: "Rosé",
  coral: "Coral",
  pink: "Rosa",
  fuchsia: "Fúcsia",
  purple: "Roxo",
  lavender: "Lavanda",
  violet: "Violeta",
  indigo: "Índigo",
  periwinkle: "Pervinca",
  blue: "Azul",
  sky: "Celeste",
  cyan: "Ciano",
  aqua: "Água",
  teal: "Verde-azulado",
  emerald: "Esmeralda",
  mint: "Menta",
  green: "Verde",
  slate: "Ardósia",
  zinc: "Zinco",
  stone: "Pedra",
};

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

/** Looks up subtle badge styling class for a tag color token. */
export function badgeClassFor(colorToken: string): string {
  return TAG_BADGE_CLASS[colorToken as TagColorToken] ?? TAG_BADGE_CLASS.stone;
}

/**
 * Which text color reads at >=4.5:1 (WCAG AA, small text) against each
 * swatch's fixed hex from `app/globals.css` (`--tag-*` does not retheme
 * between light/dark, so this pairing is a static fact, not a runtime
 * computation). Computed once via the standard relative-luminance formula;
 * only needs revisiting if a swatch hex changes. Used for text placed
 * directly on a full-opacity swatch (e.g. `SiteIdentity`'s monogram) --
 * `TAG_BADGE_CLASS`'s low-opacity tint + `text-foreground` doesn't need
 * this since it never approaches the full-swatch contrast problem.
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

/** Same boundary trade-off as `swatchClassFor`, for the Portuguese display label. */
export function colorLabelFor(colorToken: string): string {
  return TAG_COLOR_LABELS[colorToken as TagColorToken] ?? colorToken;
}
