import { notFound } from "next/navigation";
import { z } from "zod";

import { TagDetailView } from "@/components/tags/TagDetailView";
import {
  getLibraryItems,
  getLibraryItemsCountForTag,
} from "@/lib/database/queries/items";
import {
  getTagAncestors,
  getTagById,
  getTagList,
} from "@/lib/database/queries/tags";
import { parseLibrarySearchParams } from "@/lib/validation/search";

/** A single tag's own detail, actions and direct children. */
export default async function TagDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tagId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ tagId }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  if (!z.uuid().safeParse(tagId).success) {
    notFound();
  }

  const tag = await getTagById(tagId);

  if (!tag) {
    notFound();
  }

  const parsed = parseLibrarySearchParams(rawSearchParams);

  const [flatTags, ancestors, results, itemsCount] = await Promise.all([
    getTagList(),
    getTagAncestors(tagId),
    getLibraryItems({ ...parsed, tag: tagId }),
    getLibraryItemsCountForTag(tagId),
  ]);

  return (
    <TagDetailView
      tag={tag}
      flatTags={flatTags}
      ancestors={ancestors}
      items={results.items}
      itemsCount={itemsCount}
      nextCursor={results.nextCursor}
      prevCursor={results.prevCursor}
    />
  );
}
