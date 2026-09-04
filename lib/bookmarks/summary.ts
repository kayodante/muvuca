import type { BookmarkParseResult } from "./types";

export type BookmarkDuplicateSummary = {
  /** URLs distintas do arquivo que já existiam na biblioteca antes da importação. */
  alreadyInLibrary: number;
  /** Ocorrências extras da mesma URL dentro do próprio arquivo. */
  repeatedInFile: number;
};

/**
 * Separa os dois tipos de duplicata que a importação pode encontrar. O RPC não
 * consegue fazer essa distinção porque roda por lote: um link repetido no
 * arquivo pode cair em lotes diferentes e, no segundo, é indistinguível de um
 * link pré-existente. O cliente, por outro lado, tem os dois dados exatos
 * antes de qualquer escrita.
 */
export function summarizeBookmarkDuplicates(
  parseResult: BookmarkParseResult,
  existingUrls: readonly string[],
): BookmarkDuplicateSummary {
  const existing = new Set(existingUrls);
  const counted = new Set<string>();
  let alreadyInLibrary = 0;

  for (const item of parseResult.items) {
    if (counted.has(item.normalizedUrl)) continue;
    counted.add(item.normalizedUrl);
    if (existing.has(item.normalizedUrl)) alreadyInLibrary++;
  }

  return { alreadyInLibrary, repeatedInFile: parseResult.duplicateCount };
}
