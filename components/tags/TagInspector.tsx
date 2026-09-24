"use client";

import { useState, type Ref } from "react";
import Link from "next/link";
import { ArrowRightIcon, MoreHorizontalIcon, PlusIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { swatchClassFor } from "@/lib/tags/colors";
import type { FlatTag } from "@/lib/tags/tree";
import { getTagHref, TAG_MAX_DEPTH } from "@/lib/tags/routes";
import { useDictionary } from "@/lib/i18n/client";
import { TagForm } from "./TagForm";
import { TagChip } from "./TagChip";
import { DeleteTagAlertDialog } from "./DeleteTagAlertDialog";

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
  "text-headline-sm flex min-w-0 items-center gap-2 [overflow-wrap:anywhere] focus:outline-none";

/**
 * Right-hand panel of the /tags workspace: nothing selected, one tag being
 * edited, or a new tag being created. The page owns which one; this only
 * renders it. `onSelect` goes through the page's unsaved-changes guard;
 * `onSaved`/`onDeleted` are results, not navigation, so they bypass it.
 */
export function TagInspector({
  target,
  flatTags,
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
  // (below, outside that branch) instead of `tag` sidesteps the race.
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const tag =
    target.kind === "edit"
      ? (flatTags.find((candidate) => candidate.id === target.id) ?? null)
      : null;

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

  return (
    // Delegated Escape handling only (not a new interaction paradigm): an
    // open Select/menu inside consumes its own Escape first
    // (defaultPrevented), so this only fires for the panel's own bare
    // "go back to the row" shortcut.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section
      aria-labelledby={TAG_INSPECTOR_HEADING_ID}
      className="flex flex-col gap-5"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) onEscape();
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
              <p className="text-body-sm font-mono [overflow-wrap:anywhere] text-muted-foreground">
                <span className="sr-only">{t.tags.inspector.pathLabel}: </span>
                {tag.path.split("/").join(" / ")}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-sm" className="shrink-0" />
                }
              >
                <MoreHorizontalIcon aria-hidden="true" />
                <span className="sr-only">
                  {t.tags.inspector.moreActions(tag.name)}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() =>
                    setDeleteTarget({ id: tag.id, name: tag.name })
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
        <div className="flex flex-col items-start gap-3">
          {heading(t.tags.inspector.emptyTitle)}
          <p className="text-body-sm text-muted-foreground">
            {t.tags.inspector.emptyDescription}
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
