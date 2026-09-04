"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FileTextIcon,
  FilterXIcon,
  PlusIcon,
} from "lucide-react";

import { toast } from "sonner";
import { getItemDetails } from "@/lib/actions/items";
import { refreshItemPreview } from "@/lib/actions/previews";
import { notifyPreviewQueueChanged } from "@/lib/events/preview-queue";
import type {
  LibraryItem,
  LibraryItemSummary,
} from "@/lib/database/queries/items";
import type { Tag } from "@/lib/database/queries/tags";
import type { ItemType } from "@/lib/validation/item";
import type { SearchSort } from "@/lib/validation/search";
import { morph } from "@/lib/motion/view-transition";

import { EmptyState } from "@/components/states/EmptyState";
import { ImportBookmarksDialog } from "@/components/bookmarks/ImportBookmarksDialog";
import { Button } from "@/components/ui/button";

import { DeleteItemAlertDialog } from "./DeleteItemAlertDialog";
import { ItemCard } from "./ItemCard";
import { ItemEditorDialog, type EditorTarget } from "./ItemEditorDialog";
import { LibraryToolbar } from "./LibraryToolbar";
import { PromptDetailDialog } from "./PromptDetailDialog";
import { usePreviewDrain } from "./usePreviewDrain";

type DetailRequest = {
  item: LibraryItemSummary;
  target: "view" | "edit";
};

export function ItemsPage({
  items,
  tags,
  nextCursor = null,
  prevCursor = null,
  title = "Seus itens",
  headingLevel = "h1",
  emptyTitle = "Sua biblioteca está vazia",
  emptyDescription = "Salve um link, prompt ou componente para começar sua coleção.",
}: {
  items: LibraryItemSummary[];
  tags: Tag[];
  nextCursor?: string | null;
  prevCursor?: string | null;
  title?: string;
  headingLevel?: "h1" | "h2";
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [editorTarget, setEditorTarget] = useState<EditorTarget | null>(null);
  const [viewingItem, setViewingItem] = useState<LibraryItem | null>(null);
  // Which card currently owns the shared `view-transition-name`. Exactly one
  // element may carry it per snapshot, so this hands it back and forth
  // between the card and the open dialog.
  const [morphingId, setMorphingId] = useState<string | null>(null);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<LibraryItemSummary | null>(
    null,
  );
  const [detailError, setDetailError] = useState<
    (DetailRequest & { message: string }) | null
  >(null);
  const [importOpen, setImportOpen] = useState(false);
  const [isDetailPending, startDetailTransition] = useTransition();
  const latestDetailRequest = useRef(0);
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const Heading = headingLevel;

  // The queue in `link_previews` stays global per user; only the client's
  // sweep is scoped to what this page renders. Draining the whole backlog
  // from the browser starved every other Server Action of the same client
  // (they are serialized through the router queue), which made a large
  // bookmark import look frozen. Jobs outside this page wait for a page
  // that shows them -- or for the toolbar button below.
  const linkItemIds = useMemo(
    () => items.filter((item) => item.type === "link").map((item) => item.id),
    [items],
  );
  const { refreshVisible, isDraining } = usePreviewDrain(linkItemIds);

  const query = params.get("q") ?? "";
  const type = params.get("type") as ItemType | null;
  const tag = params.get("tag");
  const sort = (params.get("sort") as SearchSort | null) ?? "newest";
  const hasSearchFilters = Boolean(query || type || tag || sort !== "newest");
  const prevPageParams = new URLSearchParams(params.toString());
  if (prevCursor) prevPageParams.set("cursor", prevCursor);
  else prevPageParams.delete("cursor");
  const prevPageHref = prevCursor ? `${pathname}?${prevPageParams}` : null;

  const nextPageParams = new URLSearchParams(params.toString());
  if (nextCursor) nextPageParams.set("cursor", nextCursor);
  else nextPageParams.delete("cursor");
  const nextPageHref = nextCursor ? `${pathname}?${nextPageParams}` : null;

  // `create=1`/`import=1` in the URL are one-shot signals to open a dialog --
  // they must react to every change (sidebar link, header button,
  // cross-route navigation), not just the initial mount. Opening the dialog
  // is a render-time state adjustment (same "reset on prop change" pattern
  // as MobileNav's route reset) rather than an effect, since
  // react-hooks/set-state-in-effect flags calling setState from an effect
  // body for exactly this case. Clearing the param is a genuine external
  // side effect (router.replace) and stays in the effect below. Both flags
  // share this mechanism instead of duplicating the state/effect pair per
  // flag.
  const [handledParams, setHandledParams] = useState<typeof params | null>(
    null,
  );
  if (params !== handledParams) {
    setHandledParams(params);
    if (params.get("create") === "1") setEditorTarget({ mode: "create" });
    if (params.get("import") === "1") setImportOpen(true);
  }
  useEffect(() => {
    const clear: Record<string, null> = {};
    if (params.get("create") === "1") clear.create = null;
    if (params.get("import") === "1") clear.import = null;
    if (Object.keys(clear).length > 0) updateParams(clear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  function updateParams(values: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("cursor");
    const search = next.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, {
      scroll: false,
    });
  }

  function loadItem(item: LibraryItemSummary, target: "view" | "edit") {
    const requestId = ++latestDetailRequest.current;
    setDetailError(null);
    setLoadingItemId(item.id);
    startDetailTransition(async () => {
      try {
        const result = await getItemDetails(item.id);
        if (requestId !== latestDetailRequest.current) return;
        if (!result.ok) {
          setDetailError({ item, target, message: result.message });
          return;
        }
        if (target === "view") {
          const detail = result.data;
          morph(
            () => setMorphingId(item.id),
            () => {
              setViewingItem(detail);
              setMorphingId(null);
            },
          );
        } else {
          setEditorTarget({ mode: "edit", item: result.data });
        }
      } finally {
        if (requestId === latestDetailRequest.current) {
          setLoadingItemId(null);
        }
      }
    });
  }

  /** "Atualizar prévia" in the overflow menu. Owned here (not inside
   * ItemCard, a presentational component) so the "use server" import --
   * and the server-only enrich/ssrf chain it pulls in -- never reaches a
   * component meant to render in client-only contexts. */
  async function handleRefreshPreview(itemId: string) {
    const result = await refreshItemPreview(itemId);
    if (result.ok) {
      toast.success("Atualização da prévia solicitada.");
      notifyPreviewQueueChanged();
    } else {
      toast.error(result.message);
    }
  }

  /** Closing runs the same journey backwards: the dialog returns to its card. */
  function closeViewing() {
    const openId = viewingItem?.id ?? null;
    morph(
      () => {},
      () => {
        setViewingItem(null);
        setMorphingId(openId);
      },
    );
  }

  return (
    <>
      {/* Figma 78:3676: the section title and its controls share one row,
          heading flush left and the toolbar flush right. No item count and no
          "Importar favoritos" here -- the count belongs to the tag head above
          (or to the empty state, which already says there is nothing), and
          import lives in the account menu and in the empty state. */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Heading className="text-headline-sm mr-auto min-w-0 [overflow-wrap:anywhere]">
          {title}
        </Heading>

        <LibraryToolbar
          type={type}
          sort={sort}
          isPending={isDetailPending}
          canRefreshPreviews={linkItemIds.length > 0}
          isRefreshingPreviews={isDraining}
          onRefreshPreviews={refreshVisible}
          onFilterChange={updateParams}
        />
      </div>

      {detailError && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2"
        >
          <p className="text-sm text-destructive">{detailError.message}</p>
          <Button
            variant="outline"
            size="sm"
            pending={isDetailPending}
            onClick={() => loadItem(detailError.item, detailError.target)}
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={FileTextIcon}
          title={hasSearchFilters ? "Nenhum resultado" : emptyTitle}
          description={
            hasSearchFilters
              ? "Tente ajustar a busca ou remover um filtro."
              : emptyDescription
          }
          action={
            hasSearchFilters ? (
              <Button
                variant="outline"
                onClick={() =>
                  updateParams({ q: null, type: null, tag: null, sort: null })
                }
              >
                <FilterXIcon aria-hidden="true" data-icon="inline-start" />
                Limpar filtros
              </Button>
            ) : (
              <Button onClick={() => setEditorTarget({ mode: "create" })}>
                <PlusIcon aria-hidden="true" data-icon="inline-start" />
                Criar item
              </Button>
            )
          }
          secondaryAction={
            hasSearchFilters ? undefined : (
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                Importar favoritos
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* `auto-fill`, not `auto-fit`: with two items auto-fit collapses
              the empty tracks and stretches each card past 500px, technical rhythm. */}
          <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-4">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                tags={tags}
                morphing={morphingId === item.id}
                isPending={isDetailPending && loadingItemId === item.id}
                onEdit={() => loadItem(item, "edit")}
                onDelete={() => setDeletingItem(item)}
                onView={() => loadItem(item, "view")}
                onRefreshPreview={() => handleRefreshPreview(item.id)}
              />
            ))}
          </div>
          {(prevPageHref || nextPageHref) && (
            <nav
              aria-label="Paginação"
              className="mt-8 flex items-center justify-center gap-3"
            >
              {prevPageHref ? (
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href={prevPageHref} />}
                >
                  <ChevronLeftIcon
                    aria-hidden="true"
                    data-icon="inline-start"
                  />
                  Página anterior
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  <ChevronLeftIcon
                    aria-hidden="true"
                    data-icon="inline-start"
                  />
                  Página anterior
                </Button>
              )}

              {nextPageHref ? (
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href={nextPageHref} />}
                >
                  Próxima página
                  <ChevronRightIcon aria-hidden="true" data-icon="inline-end" />
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  Próxima página
                  <ChevronRightIcon aria-hidden="true" data-icon="inline-end" />
                </Button>
              )}
            </nav>
          )}
        </>
      )}

      {editorTarget && (
        <ItemEditorDialog
          key={editorTarget.mode === "edit" ? editorTarget.item.id : "create"}
          target={editorTarget}
          tags={tags}
          onOpenChange={(open) => !open && setEditorTarget(null)}
        />
      )}
      <PromptDetailDialog
        item={
          viewingItem?.type === "prompt" ||
          viewingItem?.type === "code_component"
            ? viewingItem
            : null
        }
        tags={tags}
        onOpenChange={(open) => !open && closeViewing()}
        onEdit={(item) => {
          setViewingItem(null);
          setMorphingId(null);
          setEditorTarget({ mode: "edit", item });
        }}
      />
      <DeleteItemAlertDialog
        item={deletingItem}
        onOpenChange={(open) => !open && setDeletingItem(null)}
      />
      <ImportBookmarksDialog open={importOpen} onOpenChange={setImportOpen} />
    </>
  );
}
