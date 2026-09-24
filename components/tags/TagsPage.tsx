"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { PlusIcon, TagIcon } from "lucide-react";

import { buildTagTree, filterTagTree, type FlatTag } from "@/lib/tags/tree";
import { useDictionary } from "@/lib/i18n/client";
import { TagTree } from "./TagTree";
import {
  TagInspector,
  TAG_INSPECTOR_HEADING_ID,
  type InspectorTarget,
} from "./TagInspector";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/states/EmptyState";

/** What the URL asked for on first render; parsed by the Server Component page. */
export type TagsPageInitial = {
  tagPath: string | null;
  create: boolean;
  parentPath: string | null;
};

// Tailwind `lg`: from here the inspector sits beside the tree.
const DESKTOP_QUERY = "(min-width: 64rem)";

function subscribeDesktop(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * The server snapshot assumes desktop: the aside is `hidden lg:block`, so a
 * phone never paints it before hydration swaps in the Sheet.
 */
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribeDesktop,
    () =>
      typeof window.matchMedia !== "function" ||
      window.matchMedia(DESKTOP_QUERY).matches,
    () => true,
  );
}

/**
 * Re-selecting the target already shown (the current row again, or "Criar
 * tag" while already creating under the same parent) is a no-op, not a
 * discard: routing it through `apply` would reset `dirty` to `false` while
 * the uncontrolled `TagForm` inputs -- unchanged, since its `key` stays the
 * same -- still hold the edited values on screen, so a later Save would
 * silently persist what the discard prompt just told the user was thrown
 * away.
 */
function isSameTarget(a: InspectorTarget, b: InspectorTarget): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "edit" && b.kind === "edit") return a.id === b.id;
  if (a.kind === "create" && b.kind === "create") {
    return a.parentId === b.parentId;
  }
  return true; // both "none"
}

function initialTarget(
  initial: TagsPageInitial,
  flatTags: FlatTag[],
): InspectorTarget {
  const byPath = (path: string | null) =>
    path ? flatTags.find((tag) => tag.path === path) : undefined;

  if (initial.create) {
    return { kind: "create", parentId: byPath(initial.parentPath)?.id ?? null };
  }
  const tag = byPath(initial.tagPath);
  return tag ? { kind: "edit", id: tag.id } : { kind: "none" };
}

/**
 * `/tags`: the curation workspace. Tree on the left, inspector for the
 * selected tag on the right (a Sheet below `lg`). Selection lives here, by
 * tag id -- a rename or move changes the slug path, never the id -- and is
 * mirrored into `?tag=` / `?new=&parent=` with `history.replaceState`, so a
 * reload or a link from `/t/...` lands on the same tag without a server
 * round-trip per click.
 */
export function TagsPage({
  flatTags,
  initial,
}: {
  flatTags: FlatTag[];
  initial: TagsPageInitial;
}) {
  const t = useDictionary();
  const isDesktop = useIsDesktop();
  const [target, setTarget] = useState<InspectorTarget>(() =>
    initialTarget(initial, flatTags),
  );
  const [dirty, setDirty] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [search, setSearch] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusInspector = useRef(false);

  const byId = new Map(flatTags.map((tag) => [tag.id, tag]));
  // A selection whose tag is gone (deleted here or elsewhere) is no selection.
  const current: InspectorTarget =
    target.kind === "edit" && !byId.has(target.id) ? { kind: "none" } : target;

  const tagParam =
    current.kind === "edit" ? (byId.get(current.id)?.path ?? null) : null;
  const parentParam =
    current.kind === "create" && current.parentId
      ? (byId.get(current.parentId)?.path ?? null)
      : null;
  const creating = current.kind === "create";

  useEffect(() => {
    const url = new URL(window.location.href);
    for (const key of ["tag", "new", "parent"]) url.searchParams.delete(key);
    if (tagParam) url.searchParams.set("tag", tagParam);
    if (creating) url.searchParams.set("new", "1");
    if (parentParam) url.searchParams.set("parent", parentParam);
    if (url.href !== window.location.href) {
      window.history.replaceState(null, "", url);
    }
  }, [tagParam, parentParam, creating]);

  // Move focus to the inspector only after a user-initiated change.
  useEffect(() => {
    if (!focusInspector.current) return;
    focusInspector.current = false;
    headingRef.current?.focus();
  });

  const apply = (next: InspectorTarget) => {
    focusInspector.current = next.kind !== "none";
    setDirty(false);
    setTarget(next);
  };

  // Anything that would drop unsaved edits asks first.
  const guard = (action: () => void) => {
    if (dirty) {
      setPendingAction(() => action);
    } else {
      action();
    }
  };

  const select = (next: InspectorTarget) => {
    if (isSameTarget(next, current)) return;
    guard(() => apply(next));
  };

  const focusRow = (id: string) =>
    document.querySelector<HTMLElement>(`[data-tag-row="${id}"]`)?.focus();

  const inspector = (
    <TagInspector
      target={current}
      flatTags={flatTags}
      headingRef={headingRef}
      onSelect={select}
      onSaved={(id) => apply({ kind: "edit", id })}
      onDeleted={() => apply({ kind: "none" })}
      onDirtyChange={setDirty}
      onEscape={() => {
        if (current.kind === "edit") focusRow(current.id);
      }}
    />
  );

  const visibleNodes = filterTagTree(buildTagTree(flatTags), search);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-headline-md">{t.tags.page.heading}</h1>
        <Button onClick={() => select({ kind: "create", parentId: null })}>
          <PlusIcon aria-hidden="true" data-icon="inline-start" />
          {t.tags.page.createTag}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          {flatTags.length === 0 ? (
            <EmptyState
              icon={TagIcon}
              title={t.tags.page.emptyTitle}
              description={t.tags.page.emptyDescription}
            />
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tag-search" className="sr-only">
                  {t.tags.page.filterLabel}
                </label>
                <Input
                  id="tag-search"
                  type="search"
                  dir="auto"
                  maxLength={80}
                  placeholder={t.tags.page.filterLabel}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="max-w-xs"
                />
              </div>
              {visibleNodes.length > 0 ? (
                <div role="region" aria-label={t.tags.page.treeRegionLabel}>
                  <TagTree
                    nodes={visibleNodes}
                    filtering={search.trim().length > 0}
                    selectedId={current.kind === "edit" ? current.id : null}
                    onSelect={(node) => select({ kind: "edit", id: node.id })}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-start gap-2 py-4">
                  <p
                    dir="auto"
                    className="text-body-sm [overflow-wrap:anywhere] text-muted-foreground"
                  >
                    {t.tags.page.noneFound(search)}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearch("")}
                  >
                    {t.tags.page.clearSearch}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {isDesktop && (
          <aside className="hidden rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-6 lg:block">
            {inspector}
          </aside>
        )}
      </div>

      {!isDesktop && (
        <Sheet
          open={current.kind !== "none"}
          onOpenChange={(open) => {
            if (!open) select({ kind: "none" });
          }}
        >
          <SheetContent
            side="right"
            aria-labelledby={TAG_INSPECTOR_HEADING_ID}
            className="w-full overflow-y-auto p-5 pt-12 sm:max-w-md"
          >
            {inspector}
          </SheetContent>
        </Sheet>
      )}

      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
      >
        <AlertDialogContent
          // Belt and suspenders: the `headingRef.current?.focus()` effect
          // below already wins this race in practice (it runs synchronously
          // in the same commit that swaps the inspector's target, before
          // Base UI's own close-focus-restoration fires), but that's timing,
          // not a contract. `finalFocus` is the mechanism Base UI documents
          // for "focus this on close" -- pointing it at the same ref makes
          // the outcome explicit instead of incidental.
          finalFocus={headingRef as RefObject<HTMLElement | null>}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{t.tags.inspector.discardTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.tags.inspector.discardDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t.tags.inspector.keepEditing}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const action = pendingAction;
                setPendingAction(null);
                setDirty(false);
                action?.();
              }}
            >
              {t.tags.inspector.discardConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
