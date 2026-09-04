import {
  BOOKMARK_BATCH_SIZE,
  type BookmarkItem,
  type BookmarkParseResult,
  type BookmarkTag,
} from "./types";

export type BookmarkBatch = {
  tags: BookmarkTag[];
  items: BookmarkItem[];
  invalidCount: number;
};

export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0 || items.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Given a set of tags and required tag keys, returns a subset of tags that
 * includes all required keys and all their ancestor folders, preserving
 * the original hierarchy order (parents before children).
 */
export function getRequiredTagHierarchy<
  T extends { key: string; parentKey: string | null },
>(allTags: T[], requiredKeys: Set<string>): T[] {
  const tagMap = new Map(allTags.map((tag) => [tag.key, tag]));
  const includedKeys = new Set<string>();

  for (const key of requiredKeys) {
    let currentKey: string | null = key;
    while (currentKey) {
      if (includedKeys.has(currentKey)) break;
      const tag = tagMap.get(currentKey);
      if (!tag) break;
      includedKeys.add(currentKey);
      currentKey = tag.parentKey;
    }
  }

  // Preserve original ordering so parent tags come before child tags
  return allTags.filter((tag) => includedKeys.has(tag.key));
}

/**
 * Slices a BookmarkParseResult into sequential, self-contained batches.
 * The first batch contains all tags to establish the entire folder structure;
 * subsequent batches contain the tag hierarchy required for their respective items.
 */
export function createBookmarkBatches(
  parseResult: BookmarkParseResult,
  batchSize: number = BOOKMARK_BATCH_SIZE,
): BookmarkBatch[] {
  if (parseResult.items.length === 0) return [];

  const itemChunks = chunkArray(parseResult.items, batchSize);

  return itemChunks.map((chunk, index) => {
    let batchTags: BookmarkTag[];
    if (index === 0) {
      batchTags = parseResult.tags;
    } else {
      const referencedTagKeys = new Set(
        chunk.flatMap((item) => (item.tagKey ? [item.tagKey] : [])),
      );
      batchTags = getRequiredTagHierarchy(parseResult.tags, referencedTagKeys);
    }

    return {
      tags: batchTags,
      items: chunk,
      // Report invalidCount in the first batch for display aggregation
      invalidCount: index === 0 ? parseResult.invalidCount : 0,
    };
  });
}
