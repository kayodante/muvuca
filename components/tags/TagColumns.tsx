"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getNamePath,
  getTagColumns,
  type FlatTag,
  type TagColumn,
} from "@/lib/tags/tree";
import { useDictionary } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { TagDot } from "./TagDot";

type RowProps = {
  selectedId: string | null;
  onSelect: (tag: FlatTag) => void;
  /** Present only in selection mode: rows become checkboxes. */
  checked?: ReadonlySet<string>;
  onToggleChecked?: (tag: FlatTag) => void;
};

const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/**
 * The /tags column browser (Finder-style): roots in the first column, then
 * one column per level down to the browsed tag, so a long list scrolls
 * inside its own column instead of stretching the page. A row *selects*
 * its tag for the inspector, which also opens its children as the next
 * column; going to a tag's items lives in the sidebar and the inspector's
 * "Abrir itens". `compact` (phones) keeps only the deepest column, with a
 * back button, and a row with children drills in instead of opening the
 * inspector Sheet -- the column header's "Editar" does that.
 */
export function TagColumns({
  flatTags,
  browseId,
  onBrowse,
  compact,
  ...rowProps
}: RowProps & {
  flatTags: FlatTag[];
  browseId: string | null;
  onBrowse: (id: string | null) => void;
  compact: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { columns, path, childCounts } = getTagColumns(flatTags, browseId);
  const byId = new Map(flatTags.map((tag) => [tag.id, tag]));
  const visible = compact ? columns.slice(-1) : columns;
  const deepest = columns.at(-1)?.owner?.id ?? null;

  // Keep the deepest column in view once the path outgrows the panel.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth) return;
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    scroller.scrollTo?.({
      left: scroller.scrollWidth,
      behavior: reduce ? "auto" : "smooth",
    });
  }, [deepest]);

  // A deep link can land on a row below the fold of its own column.
  useEffect(() => {
    scrollerRef.current
      ?.querySelector('[aria-pressed="true"]')
      ?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, []);

  return (
    <div
      ref={scrollerRef}
      className="flex min-h-0 flex-1 overflow-x-auto overscroll-x-contain"
    >
      {visible.map((column, index) => (
        <ColumnView
          key={column.owner?.id ?? "roots"}
          column={column}
          last={index === visible.length - 1}
          compact={compact}
          parentName={
            column.owner?.parentId
              ? byId.get(column.owner.parentId)?.name
              : undefined
          }
          path={path}
          childCounts={childCounts}
          onBrowse={onBrowse}
          {...rowProps}
        />
      ))}
    </div>
  );
}

function ColumnView({
  column,
  last,
  compact,
  parentName,
  path,
  childCounts,
  onBrowse,
  ...rowProps
}: RowProps & {
  column: TagColumn;
  last: boolean;
  compact: boolean;
  parentName: string | undefined;
  path: ReadonlySet<string>;
  childCounts: ReadonlyMap<string, number>;
  onBrowse: (id: string | null) => void;
}) {
  const t = useDictionary();
  const { owner, tags } = column;
  const label = owner?.name ?? t.tags.columns.roots;

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex min-h-0 flex-col overflow-y-auto overscroll-y-contain border-border",
        // The one authored moment of the page: a column slides in from the
        // one that opened it.
        "transition-[opacity,translate] duration-(--motion-base) ease-out-muvuca motion-reduce:transition-none starting:-translate-x-2 starting:opacity-0",
        // Levels share the panel evenly; past three or so they hit the
        // minimum and the row scrolls sideways to the deepest one.
        "min-w-44 flex-1 basis-0",
        !last && "border-r",
      )}
    >
      <div
        className={cn(
          "sticky top-0 z-10 flex shrink-0 items-center gap-2 bg-card px-3",
          compact ? "h-12" : "h-10",
        )}
      >
        {compact && owner ? (
          <>
            <button
              type="button"
              onClick={() => onBrowse(owner.parentId)}
              aria-label={t.tags.columns.back(
                parentName ?? t.tags.columns.roots,
              )}
              className={cn(
                "-ml-2 flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-(--motion-fast) ease-out-muvuca hover:bg-secondary/60 hover:text-foreground",
                FOCUS_RING,
              )}
            >
              <ChevronLeftIcon aria-hidden="true" className="size-4" />
            </button>
            <TagDot colorToken={owner.colorToken} className="size-2" />
            <span
              dir="auto"
              className="text-label-md min-w-0 flex-1 truncate text-foreground"
            >
              {owner.name}
            </span>
            {!rowProps.checked && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => rowProps.onSelect(owner)}
                aria-label={t.tags.columns.editTag(owner.name)}
              >
                {t.tags.columns.edit}
              </Button>
            )}
          </>
        ) : (
          <>
            {owner && (
              <TagDot colorToken={owner.colorToken} className="size-1.5" />
            )}
            <span
              dir="auto"
              className="text-label-md min-w-0 flex-1 truncate text-muted-foreground"
            >
              {label}
            </span>
            <span
              aria-hidden="true"
              className="text-metadata font-mono text-muted-foreground tabular-nums"
            >
              {tags.length}
            </span>
          </>
        )}
      </div>

      <ul className="flex flex-col gap-px px-1.5 pb-1.5">
        {tags.map((tag) => {
          const count = childCounts.get(tag.id) ?? 0;
          return (
            <li key={tag.id}>
              <TagRow
                tag={tag}
                compact={compact}
                onPath={path.has(tag.id)}
                emphasis={count > 0}
                drill={compact && count > 0}
                onDrill={() => onBrowse(tag.id)}
                description={
                  count > 0 ? t.tags.columns.childCount(count) : undefined
                }
                meta={
                  count > 0 ? (
                    <span
                      aria-hidden="true"
                      className="flex shrink-0 items-center gap-1 text-muted-foreground"
                    >
                      <span className="text-metadata font-mono tabular-nums">
                        {count}
                      </span>
                      <ChevronRightIcon
                        aria-hidden="true"
                        className="size-3.5"
                      />
                    </span>
                  ) : null
                }
                openLabel={
                  count > 0 ? t.tags.columns.open(tag.name) : undefined
                }
                {...rowProps}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Flat name matches while the filter has a query: a deep match is one
 * click away instead of hiding inside a column nobody opened. Each row
 * carries where it lives, which also tells repeated names apart.
 */
export function TagSearchResults({
  flatTags,
  query,
  onClear,
  ...rowProps
}: RowProps & {
  flatTags: FlatTag[];
  query: string;
  onClear: () => void;
}) {
  const t = useDictionary();
  const byId = new Map(flatTags.map((tag) => [tag.id, tag]));
  const q = query.trim().toLowerCase();
  const matches = flatTags.filter((tag) => tag.name.toLowerCase().includes(q));

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 p-4">
        <p
          dir="auto"
          className="text-body-sm [overflow-wrap:anywhere] text-muted-foreground"
        >
          {t.tags.page.noneFound(query)}
        </p>
        <Button variant="ghost" size="sm" onClick={onClear}>
          {t.tags.page.clearSearch}
        </Button>
      </div>
    );
  }

  return (
    <ul className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto overscroll-y-contain p-1.5">
      {matches.map((tag) => {
        const ancestors = getNamePath(tag, byId).slice(0, -1).join(" / ");
        return (
          <li key={tag.id}>
            <TagRow
              tag={tag}
              compact={false}
              onPath={false}
              emphasis
              drill={false}
              description={ancestors || undefined}
              meta={
                ancestors ? (
                  <span
                    aria-hidden="true"
                    dir="auto"
                    className="text-body-sm max-w-[50%] shrink truncate text-muted-foreground"
                  >
                    {ancestors}
                  </span>
                ) : null
              }
              {...rowProps}
            />
          </li>
        );
      })}
    </ul>
  );
}

function TagRow({
  tag,
  compact,
  onPath,
  emphasis,
  drill,
  onDrill,
  description,
  meta,
  openLabel,
  selectedId,
  onSelect,
  checked,
  onToggleChecked,
}: RowProps & {
  tag: FlatTag;
  compact: boolean;
  /** An ancestor of the browsed tag: its column is open to the right. */
  onPath: boolean;
  /** Tags with children read in full ink; leaves stay muted. */
  emphasis: boolean;
  /** Compact rows with children browse into them instead of selecting. */
  drill: boolean;
  onDrill?: () => void;
  /** Screen-reader text for `meta`, kept out of the row's name. */
  description?: string;
  meta: ReactNode;
  /** Selection mode: the name of the button that opens this tag's column. */
  openLabel?: string;
}) {
  const descriptionId = useId();
  const height = compact ? "h-11" : "h-9";

  if (checked) {
    return (
      <div
        className={cn(
          "flex items-center gap-1 rounded-lg transition-colors duration-(--motion-fast) ease-out-muvuca hover:bg-secondary/60",
          onPath && "bg-secondary/60",
        )}
      >
        <label
          className={cn(
            "text-body-lg flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 pr-1 pl-3 text-foreground",
            height,
          )}
        >
          <input
            type="checkbox"
            checked={checked.has(tag.id)}
            onChange={() => onToggleChecked?.(tag)}
            className="size-4 shrink-0 accent-primary"
          />
          <TagDot colorToken={tag.colorToken} className="size-2" />
          <span dir="auto" className="truncate">
            {tag.name}
          </span>
        </label>
        {openLabel && onDrill ? (
          <button
            type="button"
            onClick={onDrill}
            aria-label={openLabel}
            className={cn(
              "flex shrink-0 items-center rounded-md px-2 transition-colors duration-(--motion-fast) ease-out-muvuca hover:bg-secondary hover:text-foreground",
              height,
              FOCUS_RING,
            )}
          >
            {meta}
          </button>
        ) : (
          meta && <span className="flex min-w-0 pr-2">{meta}</span>
        )}
      </div>
    );
  }

  const selected = tag.id === selectedId;

  return (
    <button
      type="button"
      data-tag-row={tag.id}
      aria-pressed={drill ? undefined : selected}
      aria-describedby={description ? descriptionId : undefined}
      onClick={() => (drill ? onDrill?.() : onSelect(tag))}
      className={cn(
        "group/row text-body-lg relative flex w-full min-w-0 items-center gap-2.5 rounded-lg pr-2 pl-3 text-left transition-[background-color,color,scale] duration-(--motion-fast) ease-out-muvuca active:scale-[0.98] motion-reduce:active:scale-100",
        height,
        FOCUS_RING,
        selected
          ? "bg-secondary font-medium text-foreground"
          : onPath
            ? "bg-secondary/60 text-foreground"
            : emphasis
              ? "text-foreground hover:bg-secondary/60"
              : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      )}
    >
      {/* Selection is weight + background + this marker, never hue alone. */}
      {selected && (
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-0.5 h-4 w-1 -translate-y-1/2 rounded-full bg-primary"
        />
      )}
      <TagDot
        colorToken={tag.colorToken}
        className="size-2 transition-[scale] duration-(--motion-fast) ease-out-muvuca group-hover/row:scale-125 motion-reduce:transition-none motion-reduce:group-hover/row:scale-100"
      />
      <span dir="auto" className="min-w-0 flex-1 truncate">
        {tag.name}
      </span>
      {meta}
      {description && (
        <span id={descriptionId} hidden>
          {description}
        </span>
      )}
    </button>
  );
}
