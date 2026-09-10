import { ItemsPage } from "@/components/items/ItemsPage";
import { getLibraryItems } from "@/lib/database/queries/items";
import { parseLibrarySearchParams } from "@/lib/validation/search";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawSearchParams = await searchParams;
  const parsed = parseLibrarySearchParams(rawSearchParams);

  const results = await getLibraryItems(parsed);

  return (
    <ItemsPage
      items={results.items}
      tags={results.tags}
      nextCursor={results.nextCursor}
      prevCursor={results.prevCursor}
    />
  );
}
