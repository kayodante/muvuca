import type { Dictionary } from "@/lib/i18n/dictionaries";

/**
 * `P0001` is Postgres's default SQLSTATE for a bare `raise exception` -- the
 * hierarchy trigger (0008_tag_hierarchy.sql) and
 * `delete_tag_reparent_children` (0009/0015_tag_rpc.sql) only ever raise one
 * of these fixed Portuguese sentences that way. Exact-matched here against a
 * translated key instead of surfacing `error.message` directly, so the raw
 * Postgres string (source-controlled today, but still an internal detail)
 * never reaches the client and the result is locale-correct. An unrecognized
 * P0001 sentence (a future migration, a typo) falls back to the generic
 * translated error rather than leaking untranslated text.
 */
const TAG_P0001_MESSAGES: Record<string, keyof Dictionary["errors"]> = {
  "a tag não pode ser pai de si mesma": "tagSelfParent",
  "esta alteração criaria um ciclo na hierarquia de tags": "tagCycle",
  "a hierarquia de tags excede a profundidade máxima de 6 níveis":
    "tagMaxDepth",
  "esta alteração excederia a profundidade máxima de 6 níveis para tags descendentes":
    "tagDescendantMaxDepth",
  "tag não encontrada": "tagNotFound",
  "lote de tags inválido": "tagBatchInvalid",
};

export function tagP0001ErrorKey(
  message: string,
): keyof Dictionary["errors"] | undefined {
  return TAG_P0001_MESSAGES[message];
}
