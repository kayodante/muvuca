"use client";

import { useState, type Ref } from "react";
import Link from "next/link";
import { ArrowRightIcon, MoreHorizontalIcon, PlusIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { swatchClassFor } from "@/lib/tags/colors";
import { getNamePath, summarizeTags, type FlatTag } from "@/lib/tags/tree";
import { getTagHref, TAG_MAX_DEPTH } from "@/lib/tags/routes";
import { useDictionary } from "@/lib/i18n/client";
import { TagForm } from "./TagForm";
import { TagChip } from "./TagChip";
import { DeleteTagAlertDialog } from "./DeleteTagAlertDialog";
import { useTagExport } from "./TagExportActions";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type InspectorTarget =
  | { kind: "none" }
  | { kind: "edit"; id: string }
  | { kind: "create"; parentId: string | null };

export const TAG_INSPECTOR_HEADING_ID = "tag-inspector-heading";

const HEADING_CLASS =
  "text-headline-sm flex min-w-0 items-center gap-2 [overflow-wrap:anywhere] rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring";

const KBD_CLASS =
  "rounded-md bg-secondary px-1.5 py-0.5 font-mono text-metadata text-muted-foreground shadow-light";

/**
 * Right-hand panel of the /tags workspace: nothing selected, one tag being
 * edited, or a new tag being created. The page owns which one; this only
 * renders it. `onSelect` goes through the page's unsaved-changes guard;
 * `onSaved`/`onDeleted` are results, not navigation, so they bypass it.
 */
export function TagInspector({
  target,
  flatTags,
  itemCounts,
  headingRef,
  onSelect,
  onSaved,
  onDeleted,
  onDirtyChange,
  onEscape,
  onNavigate,
}: {
  target: InspectorTarget;
  flatTags: FlatTag[];
  itemCounts: Record<string, number>;
  headingRef: Ref<HTMLHeadingElement>;
  onSelect: (next: InspectorTarget) => void;
  onSaved: (id: string) => void;
  onDeleted: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onEscape: () => void;
  /**
   * "Abrir itens" goes to a different route, so it can't reuse `onSelect`
   * (an in-page target change). The page still owns the unsaved-changes
   * guard, so this hands it the destination instead of navigating directly.
   */
  onNavigate: (href: string) => void;
}) {
  const t = useDictionary();
  // A snapshot, not a live lookup: `deleteTag`'s own `revalidatePath` makes
  // `flatTags` drop this id in the same commit its `useActionState` result
  // resolves, so a dialog nested under `tag &&` would be torn down before it
  // ever gets to render that resolved state -- silently skipping its own
  // toast/`onDeleted` effect. Keeping the dialog mounted off `deleteTarget`
  // (below, outside that branch) instead of `tag` sidesteps the race. Same
  // reasoning covers `itemCount`/`childCount`/`parentName`: they describe
  // the tag as it was when "Excluir" was clicked, not a live recomputation.
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    itemCount: number;
    childCount: number;
    parentName: string | null;
  } | null>(null);
  const byId = new Map(flatTags.map((candidate) => [candidate.id, candidate]));
  const tag =
    target.kind === "edit"
      ? (flatTags.find((candidate) => candidate.id === target.id) ?? null)
      : null;
  const { pending: exportPending, exportJson } = useTagExport(
    tag?.id ?? "",
    tag?.path ?? "",
  );

  const heading = (content: React.ReactNode) => (
    <h2
      id={TAG_INSPECTOR_HEADING_ID}
      ref={headingRef}
      tabIndex={-1}
      dir="auto"
      className={HEADING_CLASS}
    >
      {content}
    </h2>
  );

  // Leaving create mode (the form's own "Cancelar" or a bare Escape) goes
  // back to the parent being edited, or to nothing for a root tag -- through
  // `onSelect`, so the page's unsaved-changes guard still applies.
  const cancelCreate = () => {
    if (target.kind !== "create") return;
    onSelect(
      target.parentId
        ? { kind: "edit", id: target.parentId }
        : { kind: "none" },
    );
  };

  return (
    // Delegated Escape handling only (not a new interaction paradigm): an
    // open Select/menu inside consumes its own Escape first
    // (defaultPrevented), so this only fires for the panel's own bare
    // "go back to the row" shortcut (edit mode) or "Cancelar" (create mode).
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section
      aria-labelledby={TAG_INSPECTOR_HEADING_ID}
      className="flex flex-col gap-5"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || event.defaultPrevented) return;
        if (target.kind === "create") cancelCreate();
        else onEscape();
      }}
    >
      {target.kind === "create" ? (
        <>
          {heading(t.tags.editor.createTitle)}
          <TagForm
            key={`create:${target.parentId ?? ""}`}
            target={{ mode: "create", parentId: target.parentId }}
            flatTags={flatTags}
            onSaved={onSaved}
            onDirtyChange={onDirtyChange}
            onCancel={cancelCreate}
          />
        </>
      ) : tag ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              {heading(
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-3 shrink-0 rounded-full",
                      swatchClassFor(tag.colorToken),
                    )}
                  />
                  {tag.name}
                </>,
              )}
              <p className="text-body-sm [overflow-wrap:anywhere] text-muted-foreground">
                <span className="sr-only">{t.tags.inspector.pathLabel}: </span>
                {getNamePath(tag, byId).join(" / ")}
              </p>
              <p className="text-metadata font-mono text-muted-foreground tabular-nums">
                {t.tags.inspector.itemCount(itemCounts[tag.id] ?? 0)}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    aria-busy={exportPending}
                  />
                }
              >
                <MoreHorizontalIcon aria-hidden="true" />
                <span className="sr-only">
                  {t.tags.inspector.moreActions(tag.name)}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportJson} disabled={exportPending}>
                  {exportPending ? t.export.exporting : t.tags.exportJson}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() =>
                    setDeleteTarget({
                      id: tag.id,
                      name: tag.name,
                      itemCount: itemCounts[tag.id] ?? 0,
                      childCount: flatTags.filter(
                        (candidate) => candidate.parentId === tag.id,
                      ).length,
                      parentName: tag.parentId
                        ? (byId.get(tag.parentId)?.name ?? null)
                        : null,
                    })
                  }
                >
                  {t.common.delete}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <TagForm
            key={tag.id}
            target={{ mode: "edit", tag }}
            flatTags={flatTags}
            onSaved={onSaved}
            onDirtyChange={onDirtyChange}
          />

          <TagChildren tag={tag} flatTags={flatTags} onSelect={onSelect} />

          <Link
            href={getTagHref(tag)}
            onClick={(event) => {
              // A modified click (new tab, new window, middle click) is the
              // browser's own navigation, never the guard's: intercepting it
              // would silently swallow "open in a new tab".
              if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              ) {
                return;
              }
              event.preventDefault();
              onNavigate(getTagHref(tag));
            }}
            className="text-label-md inline-flex items-center gap-1.5 self-start rounded text-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {t.tags.inspector.openItems}
            <ArrowRightIcon aria-hidden="true" className="size-4" />
          </Link>
        </>
      ) : (
        <>
          <div className="flex flex-col items-start gap-3">
            {heading(t.tags.inspector.emptyTitle)}
            <p className="text-body-sm text-muted-foreground">
              {t.tags.inspector.emptyDescription}
            </p>
            {/*
              Discoverable shortcuts, not the only way to know them: hidden
              below `sm` rather than gated on pointer capability -- there's
              no reusable `(hover: hover) and (pointer: fine)` utility in
              the project yet (ItemCard.tsx repeats the raw arbitrary
              variant inline), so this stays a plain breakpoint instead of
              introducing one for a single, low-stakes hint.
            */}
            <p className="text-metadata hidden flex-wrap items-center gap-x-1.5 gap-y-1 text-muted-foreground sm:flex">
              <kbd className={KBD_CLASS}>/</kbd>{" "}
              {t.tags.inspector.shortcutFilter}
              <kbd className={KBD_CLASS}>↑↓</kbd>{" "}
              {t.tags.inspector.shortcutNavigate}
              <kbd className={KBD_CLASS}>Enter</kbd>{" "}
              {t.tags.inspector.shortcutSelect}
              <kbd className={KBD_CLASS}>Esc</kbd>{" "}
              {t.tags.inspector.shortcutBack}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelect({ kind: "create", parentId: null })}
            >
              <PlusIcon aria-hidden="true" data-icon="inline-start" />
              {t.tags.page.createTag}
            </Button>
          </div>
          {flatTags.length > 0 && (
            <TagCuration
              flatTags={flatTags}
              itemCounts={itemCounts}
              onSelect={onSelect}
            />
          )}
        </>
      )}

      <DeleteTagAlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        tag={deleteTarget}
        onDeleted={() => {
          setDeleteTarget(null);
          onDeleted();
        }}
      />
    </section>
  );
}

const CURATION_PREVIEW = 12;

const CHIP_HOVER_CLASS =
  "transition-[box-shadow] duration-(--motion-fast) ease-out-muvuca hover:inset-shadow-light-2 motion-reduce:transition-none";

/**
 * The inspector while nothing is selected: the hierarchy's shape and the
 * tags worth a curation pass -- the same name living in two branches
 * (typical after a bookmark import), tags with no items anywhere in their
 * subtree, and tags one merge/delete away from tidy. Every chip selects
 * its tag, so a pass is click, fix, save, next.
 */
function TagCuration({
  flatTags,
  itemCounts,
  onSelect,
}: {
  flatTags: FlatTag[];
  itemCounts: Record<string, number>;
  onSelect: (next: InspectorTarget) => void;
}) {
  const t = useDictionary();
  const summary = summarizeTags(flatTags, itemCounts);
  const byId = new Map(flatTags.map((tag) => [tag.id, tag]));
  const { empty, single, repeatedNames } = summary;

  return (
    <div className="flex flex-col gap-5 border-t border-border pt-5">
      <p className="text-metadata font-mono text-muted-foreground tabular-nums">
        {t.tags.inspector.summary(summary.total, summary.roots, summary.levels)}
      </p>

      {repeatedNames.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-label-md flex items-baseline gap-2 text-foreground">
            {t.tags.inspector.repeatedNames}
            <span className="text-metadata font-mono text-muted-foreground tabular-nums">
              {repeatedNames.length}
            </span>
          </h3>
          <p className="text-body-sm text-muted-foreground">
            {t.tags.inspector.repeatedNamesHint}
          </p>
          <div className="flex flex-col gap-3">
            {repeatedNames.map((group) => (
              <div key={group[0]!.id} className="flex flex-col gap-1.5">
                <p className="flex items-baseline gap-2">
                  <span className="text-label-md text-foreground">
                    {group[0]!.name}
                  </span>
                  <span className="text-metadata font-mono text-muted-foreground tabular-nums">
                    ×{group.length}
                  </span>
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {group.map((tag) => {
                    const ancestors = getNamePath(tag, byId)
                      .slice(0, -1)
                      .join(" / ");
                    const location = ancestors || t.tags.inspector.rootLabel;
                    return (
                      <li key={tag.id}>
                        <button
                          type="button"
                          onClick={() => onSelect({ kind: "edit", id: tag.id })}
                          aria-label={t.tags.inspector.repeatedNameChipLabel(
                            tag.name,
                            location,
                          )}
                          className="max-w-full rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <TagChip
                            name={location}
                            colorToken={tag.colorToken}
                            className={CHIP_HOVER_CLASS}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <CurationPreviewSection
        heading={t.tags.inspector.emptyTags}
        hint={t.tags.inspector.emptyTagsHint}
        tags={empty}
        byId={byId}
        onSelect={onSelect}
      />

      <CurationPreviewSection
        heading={t.tags.inspector.singleItemTags}
        hint={t.tags.inspector.singleItemTagsHint}
        tags={single}
        byId={byId}
        onSelect={onSelect}
      />

      {repeatedNames.length === 0 &&
        empty.length === 0 &&
        single.length === 0 && (
          <p className="text-body-sm text-muted-foreground">
            {t.tags.inspector.allTidy}
          </p>
        )}
    </div>
  );
}

/**
 * "Vazias" and "Com 1 item" are the same shape (heading + count, a hint
 * line, a chip grid that previews `CURATION_PREVIEW` and expands, chip
 * label = tag name with the full path in `title`) so they share this one
 * implementation instead of two near-identical blocks.
 */
function CurationPreviewSection({
  heading,
  hint,
  tags,
  byId,
  onSelect,
}: {
  heading: string;
  hint: string;
  tags: FlatTag[];
  byId: Map<string, FlatTag>;
  onSelect: (next: InspectorTarget) => void;
}) {
  const t = useDictionary();
  const [showAll, setShowAll] = useState(false);

  if (tags.length === 0) return null;

  const shown = showAll ? tags : tags.slice(0, CURATION_PREVIEW);

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-label-md flex items-baseline gap-2 text-foreground">
        {heading}
        <span className="text-metadata font-mono text-muted-foreground tabular-nums">
          {tags.length}
        </span>
      </h3>
      <p className="text-body-sm text-muted-foreground">{hint}</p>
      <ul className="flex flex-wrap gap-1.5">
        {shown.map((tag) => (
          <li key={tag.id}>
            <button
              type="button"
              onClick={() => onSelect({ kind: "edit", id: tag.id })}
              title={getNamePath(tag, byId).join(" / ")}
              className="max-w-full rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <TagChip
                name={tag.name}
                colorToken={tag.colorToken}
                className={CHIP_HOVER_CLASS}
              />
            </button>
          </li>
        ))}
      </ul>
      {tags.length > CURATION_PREVIEW && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          aria-expanded={showAll}
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll
            ? t.tags.inspector.showLess
            : t.tags.inspector.showAll(tags.length)}
        </Button>
      )}
    </section>
  );
}

function TagChildren({
  tag,
  flatTags,
  onSelect,
}: {
  tag: FlatTag;
  flatTags: FlatTag[];
  onSelect: (next: InspectorTarget) => void;
}) {
  const t = useDictionary();
  const children = flatTags.filter(
    (candidate) => candidate.parentId === tag.id,
  );
  const atMaxDepth = tag.path.split("/").length >= TAG_MAX_DEPTH;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-label-md text-muted-foreground">
        {t.tags.inspector.children}
      </h3>
      {children.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">
          {t.tags.inspector.noChildren}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {children.map((child) => (
            <li key={child.id}>
              <button
                type="button"
                onClick={() => onSelect({ kind: "edit", id: child.id })}
                className="rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <TagChip name={child.name} colorToken={child.colorToken} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {atMaxDepth ? (
        <p className="text-body-sm text-muted-foreground">
          {t.tags.inspector.maxDepthReached}
        </p>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => onSelect({ kind: "create", parentId: tag.id })}
        >
          <PlusIcon aria-hidden="true" data-icon="inline-start" />
          {t.tags.inspector.addChild}
        </Button>
      )}
    </div>
  );
}
