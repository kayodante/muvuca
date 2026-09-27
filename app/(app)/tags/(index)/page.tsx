import type { Metadata } from "next";

import { getTagItemCounts, getTagList } from "@/lib/database/queries/tags";
import { getDictionary } from "@/lib/i18n/server";
import { TagsPage } from "@/components/tags/TagsPage";

type SearchParams = Record<string, string | string[] | undefined>;

// Only compared against the caller's own tag paths on the client; the cap
// just keeps an absurd URL from being carried around. 6 levels x 100 chars.
const MAX_PATH_LENGTH = 606;

function singlePath(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.length <= MAX_PATH_LENGTH
    ? value
    : null;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.tags.page.heading };
}

/** Tag curation workspace; `?tag=`/`?new=&parent=` pick the initial inspector state. */
export default async function TagsRootPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [flatTags, itemCounts, params] = await Promise.all([
    getTagList(),
    getTagItemCounts(),
    searchParams,
  ]);

  return (
    <TagsPage
      flatTags={flatTags}
      itemCounts={itemCounts}
      initial={{
        tagPath: singlePath(params.tag),
        create: params.new === "1",
        parentPath: singlePath(params.parent),
      }}
    />
  );
}
