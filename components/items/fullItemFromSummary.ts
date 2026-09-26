import type {
  LibraryItem,
  LibraryItemSummary,
} from "@/lib/database/queries/items";

export function fullItemFromSummary(
  summary: LibraryItemSummary,
): LibraryItem | null {
  if (summary.type === "link") return null;
  if ([...summary.contentPreview].length >= 2000) return null;

  const { id, title, description, tagIds, contentPreview: content } = summary;
  if (summary.type === "prompt") {
    return {
      id,
      type: "prompt",
      title,
      description,
      url: null,
      content,
      tagIds,
    };
  }
  return {
    id,
    type: "code_component",
    title,
    description,
    url: summary.url,
    content,
    language: summary.language,
    tagIds,
  };
}
