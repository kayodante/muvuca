import Link from "next/link";

import { swatchClassFor } from "@/lib/tags/colors";
import { cn } from "@/lib/utils";
import type { Tag, TagAncestor } from "@/lib/database/queries/tags";
import type { LibraryItemSummary } from "@/lib/database/queries/items";
import { ptBR, type Dictionary } from "@/lib/i18n/dictionaries/pt-BR";
import { Breadcrumb } from "./Breadcrumb";

import { ItemsPage } from "@/components/items/ItemsPage";

/**
 * `/t/[...tagPath]`: breadcrumb, this tag's own head (name, badge, item/subtag
 * counts) and its indexed, deduplicated item rollup for the subtree.
 * Editing happens in the `/tags` inspector, linked from here.
 *
 * `t` is optional (default `ptBR`), same pattern as `Breadcrumb`: its own
 * unit test renders it directly through `createRoot()` (plain client
 * rendering, not the RSC pipeline), so it can't be `async` to call
 * `getDictionary()` itself -- the caller (`app/(app)/t/[...tagPath]/page.tsx`,
 * already async) resolves and passes it down instead.
 */
export function TagDetailView({
  tag,
  childCount,
  tags,
  ancestors,
  items,
  itemsCount,
  nextCursor,
  prevCursor = null,
  t = ptBR,
}: {
  tag: Tag;
  childCount: number;
  tags: Tag[];
  ancestors: TagAncestor[];
  items: LibraryItemSummary[];
  itemsCount: number;
  nextCursor: string | null;
  prevCursor?: string | null;
  t?: Dictionary;
}) {
  return (
    // Figma 78:3675 & 43:989: breadcrumb integrado no cabeçalho e barra da seção a 16px.
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-2xl bg-background p-1 pl-6 shadow-light sm:h-[90px] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col justify-center py-2">
          <Breadcrumb ancestors={ancestors} currentName={tag.name} t={t} />
          <h1
            dir="auto"
            className="text-headline-md flex min-w-0 flex-wrap items-center gap-4 py-1 [overflow-wrap:anywhere]"
          >
            {t.tags.detail.headingPrefix}
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-secondary px-3 py-1 shadow-light">
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
          <Link
            href={`/tags?${new URLSearchParams({ tag: tag.path })}`}
            className="text-label-md self-start rounded text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {t.tags.detail.editTag}
          </Link>
        </div>

        <div className="flex gap-2 p-1">
          <div className="flex h-[82px] w-[108px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl bg-linear-to-b from-secondary to-card p-4 shadow-light">
            <span className="font-pixel text-[32px] leading-none text-foreground">
              {itemsCount}
            </span>
            <span className="text-body-sm text-muted-foreground">
              {t.tags.detail.itemsLabel}
            </span>
          </div>
          <div className="flex h-[82px] w-[108px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl bg-linear-to-b from-secondary to-card p-4 shadow-light">
            <span className="font-pixel text-[32px] leading-none text-foreground">
              {childCount}
            </span>
            <span className="text-body-sm text-muted-foreground">
              {t.tags.detail.subtagsLabel}
            </span>
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
        tags={tags}
        nextCursor={nextCursor}
        prevCursor={prevCursor}
        headingLevel="h2"
        emptyTitle={t.tags.detail.emptyItemsTitle}
        emptyDescription={t.tags.detail.emptyItemsDescription}
      />
    </div>
  );
}
