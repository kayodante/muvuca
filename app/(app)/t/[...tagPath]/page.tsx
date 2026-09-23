import { notFound } from "next/navigation";

import { TagDetailView } from "@/components/tags/TagDetailView";
import {
  getLibraryItems,
  getLibraryItemsCountForTag,
} from "@/lib/database/queries/items";
import { getChildTagCount, getTagByPath } from "@/lib/database/queries/tags";
import { tagPathSegmentsSchema } from "@/lib/tags/routes";
import { parseLibrarySearchParams } from "@/lib/validation/search";
import { getDictionary } from "@/lib/i18n/server";

/**
 * A single tag's own detail, actions and direct children, addressed by its
 * slug path (`/t/design/recursos-assets/icones`, AAA-96). The path is only
 * routing: once resolved, everything below runs by the tag's UUID.
 */
export default async function TagDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tagPath: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ tagPath }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  // Untrusted input: malformed or too deep never reaches the database.
  const segments = tagPathSegmentsSchema.safeParse(tagPath);

  if (!segments.success) {
    notFound();
  }

  const resolved = await getTagByPath(segments.data);

  if (!resolved) {
    notFound();
  }

  const { tag, ancestors } = resolved;
  const parsed = parseLibrarySearchParams(rawSearchParams);

  const [childCount, results, itemsCount, t] = await Promise.all([
    getChildTagCount(tag.id),
    getLibraryItems({ ...parsed, tag: tag.id }),
    getLibraryItemsCountForTag(tag.id),
    getDictionary(),
  ]);

  return (
    <TagDetailView
      tag={tag}
      childCount={childCount}
      tags={results.tags}
      ancestors={ancestors}
      items={results.items}
      itemsCount={itemsCount}
      nextCursor={results.nextCursor}
      prevCursor={results.prevCursor}
      t={t}
    />
  );
}
