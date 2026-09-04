import { buildTagTree, findTagNode } from "@/lib/tags/tree";
import { swatchClassFor } from "@/lib/tags/colors";
import { cn } from "@/lib/utils";
import type { Tag, TagAncestor } from "@/lib/database/queries/tags";
import type { LibraryItemSummary } from "@/lib/database/queries/items";
import { Breadcrumb } from "./Breadcrumb";

import { ItemsPage } from "@/components/items/ItemsPage";

/**
 * `/tags/[tagId]`: breadcrumb, this tag's own head (name, badge, item/subtag
 * counts) and its indexed, deduplicated item rollup for the subtree.
 * Creating/editing/deleting tags and browsing the child tree happen on
 * `/tags`, not here.
 */
export function TagDetailView({
  tag,
  flatTags,
  ancestors,
  items,
  itemsCount,
  nextCursor,
  prevCursor = null,
}: {
  tag: Tag;
  flatTags: Tag[];
  ancestors: TagAncestor[];
  items: LibraryItemSummary[];
  itemsCount: number;
  nextCursor: string | null;
  prevCursor?: string | null;
}) {
  const treeNodes = buildTagTree(flatTags);
  const currentNode = findTagNode(treeNodes, tag.id);
  const children = currentNode?.children ?? [];

  return (
    // Figma 78:3675: breadcrumb, cabeçalho e barra da seção a 16px.
    <div className="flex flex-col gap-4">
      <Breadcrumb ancestors={ancestors} currentName={tag.name} />

      <div className="flex flex-col gap-4 rounded-xl border border-border p-1 pl-6 sm:flex-row sm:items-center sm:justify-between">
        <h1
          dir="auto"
          className="text-headline-md flex min-w-0 flex-wrap items-center gap-4 py-3 [overflow-wrap:anywhere]"
        >
          Sua Muvuca em
          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-secondary px-3 py-1">
            <span
              aria-hidden="true"
              className={cn(
                "size-3 shrink-0 rounded-full",
                swatchClassFor(tag.colorToken),
              )}
            />
            <span className="truncate">{tag.name}</span>
          </span>
        </h1>

        <div className="flex gap-2 p-1">
          <div className="flex min-w-[92px] flex-col items-center gap-1 rounded-lg bg-card p-4">
            <span className="font-pixel text-3xl">{itemsCount}</span>
            <span className="text-body-sm text-muted-foreground">itens</span>
          </div>
          <div className="flex min-w-[92px] flex-col items-center gap-1 rounded-lg bg-card p-4">
            <span className="font-pixel text-3xl">{children.length}</span>
            <span className="text-body-sm text-muted-foreground">subtags</span>
          </div>
        </div>
      </div>

      {tag.description && (
        <p
          dir="auto"
          className="text-body-sm max-w-prose [overflow-wrap:anywhere] text-muted-foreground"
        >
          {tag.description}
        </p>
      )}

      <ItemsPage
        items={items}
        tags={flatTags}
        nextCursor={nextCursor}
        prevCursor={prevCursor}
        headingLevel="h2"
        emptyTitle="Nenhum item nesta tag"
        emptyDescription="Itens associados a esta tag e às tags filhas aparecem aqui."
      />
    </div>
  );
}
