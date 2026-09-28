"use client";

import type { LibraryItemSummary } from "@/lib/database/queries/items";
import type { Tag } from "@/lib/database/queries/tags";
import { ItemCardLink } from "./ItemCardLink";
import { ItemCardCode, ItemCardPrompt } from "./ItemCardStoredContent";

export function ItemCard({
  item,
  tags,
  morphing,
  isPending = false,
  onEdit,
  onDelete,
  onView,
  onCopyContent,
  onRefreshPreview,
}: {
  item: LibraryItemSummary;
  tags: Tag[];
  /** This card is the origin (or destination) of the open prompt or code dialog. */
  morphing: boolean;
  isPending?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
  /**
   * Resolves the item's full stored body, for prompt and code_component
   * cards. The summary only carries `contentPreview`, which the search RPC
   * truncates at 2000 characters, so copying it silently dropped the tail of
   * anything longer (AAA-95). Injected for the same reason as
   * `onRefreshPreview`: the read is a server action, and this component must
   * stay free of that import chain. Rejects when the read fails.
   */
  onCopyContent: () => Promise<string>;
  /**
   * Injected instead of ItemCard calling the `refreshItemPreview` server
   * action itself: this is a presentational component, and a direct import
   * of a "use server" action here drags its whole server-only dependency
   * graph (enrich -> ssrf -> node:net) into any bundler that doesn't apply
   * Next's RSC transform. The real implementation lives one level up, in
   * ItemsPage.
   */
  onRefreshPreview: () => void;
}) {
  const itemTags = item.tagIds.flatMap((tagId) => {
    const tag = tags.find((candidate) => candidate.id === tagId);
    return tag ? [tag] : [];
  });
  const base = { itemTags, morphing, isPending, onEdit, onDelete };

  switch (item.type) {
    case "link":
      return (
        <ItemCardLink
          {...base}
          item={item}
          onRefreshPreview={onRefreshPreview}
        />
      );
    case "prompt":
      return (
        <ItemCardPrompt
          {...base}
          item={item}
          onView={onView}
          onCopyContent={onCopyContent}
        />
      );
    case "code_component":
      return (
        <ItemCardCode
          {...base}
          item={item}
          onView={onView}
          onCopyContent={onCopyContent}
        />
      );
  }
}
