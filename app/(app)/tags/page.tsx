import { getTagList } from "@/lib/database/queries/tags";
import { TagsPage } from "@/components/tags/TagsPage";

/** Full tag CRUD and tree navigation. */
export default async function TagsRootPage() {
  const flatTags = await getTagList();

  return <TagsPage flatTags={flatTags} />;
}
