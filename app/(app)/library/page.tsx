import { ItemsPage } from "@/components/items/ItemsPage";
import { getLibraryItems } from "@/lib/database/queries/items";
import { getTagList } from "@/lib/database/queries/tags";
import { librarySearchParamsSchema } from "@/lib/validation/search";
import { notFound } from "next/navigation";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawSearchParams = await searchParams;
  const parsed = librarySearchParamsSchema.safeParse(rawSearchParams);
  if (!parsed.success) notFound();

  const [results, tags] = await Promise.all([
    getLibraryItems(parsed.data),
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
