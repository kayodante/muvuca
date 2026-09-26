"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, SearchIcon, TagIcon } from "lucide-react";

import type { FlatTag } from "@/lib/tags/tree";
import { useDictionary } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { TagColumns, TagSearchResults } from "./TagColumns";
import {
  TagInspector,
  TAG_INSPECTOR_HEADING_ID,
  type InspectorTarget,
} from "./TagInspector";
import { TagBulkPanel } from "./TagBulkPanel";

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

// Tailwind `xl`: from here the inspector sits beside the columns. Below it
// the columns get the full width and the inspector is a Sheet.
const DESKTOP_QUERY = "(min-width: 80rem)";
// Below Tailwind `sm` only the deepest column fits.
const PHONE_QUERY = "(max-width: 39.99rem)";

function subscribeTo(query: string) {
  return (onChange: () => void) => {
    if (typeof window.matchMedia !== "function") return () => {};
    const list = window.matchMedia(query);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  };
}

const subscribeDesktop = subscribeTo(DESKTOP_QUERY);
const subscribePhone = subscribeTo(PHONE_QUERY);

function matches(query: string, fallback: boolean): boolean {
  return typeof window.matchMedia === "function"
    ? window.matchMedia(query).matches
    : fallback;
}

/**
 * The server snapshot assumes desktop: the aside is `hidden xl:block`, so a
 * phone never paints it before hydration swaps in the Sheet.
 */
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribeDesktop,
    () => matches(DESKTOP_QUERY, true),
    () => true,
  );
}

function useIsPhone(): boolean {
  return useSyncExternalStore(
    subscribePhone,
    () => matches(PHONE_QUERY, false),
    () => false,
  );
}

/** The tag whose column a target opens: the edited tag, or the new tag's parent. */
function browseIdFor(target: InspectorTarget): string | null {
  if (target.kind === "edit") return target.id;
  if (target.kind === "create") return target.parentId;
  return null;
}

/** "/" jumps to the filter unless the keystroke is someone's text. */
function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.closest(
        "input, textarea, select, [role='dialog'], [role='alertdialog'], [role='menu']",
      ) !== null)
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
 * round-trip per click. `Selecionar` switches to selection mode: checkboxes
 * in the tree and `TagBulkPanel` where the inspector was.
 */
export function TagsPage({
  flatTags,
  initial,
}: {
  flatTags: FlatTag[];
  initial: TagsPageInitial;
}) {
  const t = useDictionary();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const isPhone = useIsPhone();
  const [target, setTarget] = useState<InspectorTarget>(() =>
    initialTarget(initial, flatTags),
  );
  // Which column path is open. Follows the inspector, but also moves on its
  // own: selection mode and the phone's back/drill browse without selecting.
  const [browseId, setBrowseId] = useState<string | null>(() =>
    browseIdFor(initialTarget(initial, flatTags)),
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const [dirty, setDirty] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [search, setSearch] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [checked, setChecked] = useState<ReadonlySet<string>>(() => new Set());
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusInspector = useRef(false);
  const selectToggleRef = useRef<HTMLButtonElement>(null);
  const focusSelectToggle = useRef(false);
  // Fallback landing spot for `focusSelectToggle` when a bulk delete empties
  // `flatTags`: the toggle itself unmounts (`flatTags.length > 0 &&` below),
  // so there is no row left to return focus to.
  const createButtonRef = useRef<HTMLButtonElement>(null);

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

  // Selection mode has no inspector heading to land on, so entering it and
  // every way out of it (bulk success, the panel's own cancel, the header
  // toggle) returns focus to the toggle button instead of letting it fall
  // to <body>.
  useEffect(() => {
    if (!focusSelectToggle.current) return;
    focusSelectToggle.current = false;
    (selectToggleRef.current ?? createButtonRef.current)?.focus();
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== "/" ||
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isTypingTarget(event.target) ||
        !searchRef.current
      ) {
        return;
      }
      event.preventDefault();
      searchRef.current.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const apply = (next: InspectorTarget) => {
    focusInspector.current = next.kind !== "none";
    setDirty(false);
    setTarget(next);
    const nextBrowseId = browseIdFor(next);
    if (nextBrowseId) setBrowseId(nextBrowseId);
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

  const stopSelecting = () => {
    setSelecting(false);
    setChecked(new Set());
  };

  // The header toggle's own click, the panel's "Cancelar seleção" and a
  // successful bulk action all leave selection mode with no row to return
  // focus to -- unlike `stopSelecting` alone, used when "Criar tag" leaves
  // selection mode only to immediately hand focus to the create form.
  const endSelecting = () => {
    stopSelecting();
    focusSelectToggle.current = true;
  };

  const startSelecting = () =>
    guard(() => {
      apply({ kind: "none" });
      setSelecting(true);
      focusSelectToggle.current = true;
    });

  const toggleChecked = (id: string) =>
    setChecked((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Tags deleted meanwhile drop out of the selection.
  const checkedIds = [...checked].filter((id) => byId.has(id));

  const bulkPanel = (
    <TagBulkPanel
      selectedIds={checkedIds}
      flatTags={flatTags}
      onDone={endSelecting}
      onCancel={endSelecting}
    />
  );

  const focusRow = (id: string) =>
    document.querySelector<HTMLElement>(`[data-tag-row="${id}"]`)?.focus();

  const inspector = (
    <TagInspector
      target={current}
      flatTags={flatTags}
      headingRef={headingRef}
      onSelect={select}
      onSaved={(id) => apply({ kind: "edit", id })}
      onDeleted={() => {
        apply({ kind: "none" });
        // A single delete is a result, not a user-initiated selection change,
        // so `apply` itself leaves `focusInspector` false for "none" -- set
        // it after, so the empty-state heading still gets focus instead of
        // letting it fall to <body> (desktop only; on mobile the Sheet
        // closes and unmounts the heading before this effect runs).
        focusInspector.current = true;
      }}
      onDirtyChange={setDirty}
      onEscape={() => {
        if (current.kind === "edit") focusRow(current.id);
      }}
      onNavigate={(href) => guard(() => router.push(href))}
    />
  );

  const rowProps = {
    selectedId: current.kind === "edit" ? current.id : null,
    onSelect: (tag: FlatTag) => select({ kind: "edit", id: tag.id }),
    checked: selecting ? checked : undefined,
    onToggleChecked: (tag: FlatTag) => toggleChecked(tag.id),
  };

  return (
    <div className={cn("flex flex-col gap-6", selecting && "pb-32 xl:pb-0")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-headline-md">{t.tags.page.heading}</h1>
        <div className="flex gap-2">
          {flatTags.length > 0 && (
            <Button
              ref={selectToggleRef}
              variant="outline"
              onClick={selecting ? endSelecting : startSelecting}
            >
              {selecting ? t.tags.page.cancelSelection : t.tags.page.select}
            </Button>
          )}
          <Button
            ref={createButtonRef}
            onClick={() => {
              stopSelecting();
              select({ kind: "create", parentId: null });
            }}
          >
            <PlusIcon aria-hidden="true" data-icon="inline-start" />
            {t.tags.page.createTag}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] xl:items-start">
        {flatTags.length === 0 ? (
          <EmptyState
            icon={TagIcon}
            title={t.tags.page.emptyTitle}
            description={t.tags.page.emptyDescription}
          />
        ) : (
          <div
            className={cn(
              "flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card",
              // Same bound as the inspector aside below: the columns scroll
              // inside the panel, never the page.
              "sm:max-h-[calc(100dvh-var(--layout-topbar-min-height)-1.5rem-8rem)] xl:sticky xl:top-[calc(var(--layout-topbar-min-height)+1.5rem)]",
            )}
          >
            <div className="relative shrink-0 border-b border-border p-2">
              <label htmlFor="tag-search" className="sr-only">
                {t.tags.page.filterLabel}
              </label>
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                ref={searchRef}
                id="tag-search"
                type="search"
                dir="auto"
                maxLength={80}
                placeholder={t.tags.page.filterLabel}
                aria-keyshortcuts="/"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && search) {
                    event.preventDefault();
                    setSearch("");
                  }
                }}
                className="border-transparent bg-secondary/60 pr-10 pl-9 shadow-none dark:bg-secondary/60"
              />
              {!search && (
                <kbd
                  aria-hidden="true"
                  className="text-metadata pointer-events-none absolute top-1/2 right-4 hidden -translate-y-1/2 rounded-md bg-card px-1.5 py-0.5 font-mono text-muted-foreground shadow-light sm:block"
                >
                  /
                </kbd>
              )}
            </div>
            <div
              role="region"
              aria-label={t.tags.page.treeRegionLabel}
              className="flex min-h-0 flex-1 flex-col"
            >
              {search.trim() ? (
                <TagSearchResults
                  flatTags={flatTags}
                  query={search}
                  onClear={() => {
                    setSearch("");
                    searchRef.current?.focus();
                  }}
                  {...rowProps}
                />
              ) : (
                <TagColumns
                  flatTags={flatTags}
                  browseId={browseId}
                  onBrowse={setBrowseId}
                  compact={isPhone}
                  {...rowProps}
                />
              )}
            </div>
          </div>
        )}

        {isDesktop && (
          <aside
            className={cn(
              "hidden rounded-2xl border border-border bg-card p-5 xl:block",
              // Offset below the sticky Topbar (--layout-topbar-min-height,
              // Topbar.tsx) instead of a bare `top-6`, which let the panel
              // stick 24px under the header with its lower half (Save,
              // children, "Abrir itens") off-screen. Bounded height + its
              // own scroll keeps the panel from growing past the viewport.
              // The bound also subtracts the shell's 8rem bottom fade
              // (AppShell.tsx), so the panel ends above it instead of
              // padding every state -- empty and bulk included -- with 8rem
              // of dead space to scroll clear of it.
              "xl:sticky xl:top-[calc(var(--layout-topbar-min-height)+1.5rem)] xl:max-h-[calc(100dvh-var(--layout-topbar-min-height)-1.5rem-8rem)] xl:overflow-y-auto",
            )}
          >
            {selecting ? bulkPanel : inspector}
          </aside>
        )}
      </div>

      {!isDesktop && (
        <Sheet
          open={!selecting && current.kind !== "none"}
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
      {!isDesktop && selecting && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background p-4">
          {bulkPanel}
        </div>
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
