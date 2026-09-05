import { ItemsPage } from "@/components/items/ItemsPage";
import { getLibraryItems } from "@/lib/database/queries/items";
import { getTagList } from "@/lib/database/queries/tags";
import { parseLibrarySearchParams } from "@/lib/validation/search";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawSearchParams = await searchParams;
  const parsed = parseLibrarySearchParams(rawSearchParams);

  const [results, tags] = await Promise.all([
    getLibraryItems(parsed),
    getTagList(),
  ]);

  return (
    <ItemsPage
      items={results.items}
      tags={tags}
      nextCursor={results.nextCursor}
      prevCursor={results.prevCursor}
    />
  );
}
