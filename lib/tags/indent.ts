/**
 * Depth indentation for every tag tree (sidebar, manager, import preview).
 *
 * A lookup table rather than a computed inline style: production CSP keeps
 * `style-src-attr` exempt only for the runtime positioning third-party
 * components need (see `lib/security/headers.ts`), and our own layout has no
 * business widening that surface for a value that is one of six constants.
 * Tailwind only emits classes it can find literally in the source, so the
 * six variants are written out.
 *
 * One 16px step for all three trees, short and consistent; the tag
 * hierarchy is capped at 6 levels, so six entries cover every valid depth
 * and deeper input clamps to the last one.
 */
const TREE_INDENT = [
  "pl-0",
  "pl-4",
  "pl-8",
  "pl-12",
  "pl-16",
  "pl-20",
] as const;

export function indentClassFor(depth: number): string {
  const index = Math.min(Math.max(depth, 0), TREE_INDENT.length - 1);
  return TREE_INDENT[index] ?? TREE_INDENT[0];
}
