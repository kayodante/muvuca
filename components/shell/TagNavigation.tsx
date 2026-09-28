"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDownIcon, SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { swatchClassFor } from "@/lib/tags/colors";
import {
  buildTagTree,
  filterTagTree,
  type FlatTag,
  type TagNode,
} from "@/lib/tags/tree";
import { getTagHref } from "@/lib/tags/routes";
import { Input } from "@/components/ui/input";
import { useDictionary } from "@/lib/i18n/client";

/** Compact, navigation-only tag tree for the persistent app shell. */
export function TagNavigation({ tags }: { tags: FlatTag[] }) {
  const t = useDictionary();
  const pathname = usePathname();
  const nodes = buildTagTree(tags);
  const [query, setQuery] = useState("");
  const [expandedById, setExpandedById] = useState<Record<string, boolean>>({});

  const visibleNodes = filterTagTree(nodes, query);

  return (
    <section
      aria-labelledby="sidebar-tags-heading"
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="shrink-0">
        <div className="mb-2 flex items-center justify-between gap-2 px-2">
          <h2
            id="sidebar-tags-heading"
            className="text-label-md tracking-wide text-muted-foreground uppercase"
          >
            {t.shell.tagNav.heading}
          </h2>
          <Link
            href="/tags"
            className="text-label-md rounded-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {t.shell.tagNav.manageTags}
          </Link>
        </div>
        {nodes.length > 0 && (
          <div className="relative mb-2">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              dir="auto"
              maxLength={80}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.shell.tagNav.searchPlaceholder}
              aria-label={t.shell.tagNav.searchAriaLabel}
              // Borderless, so Input's focus border never shows; the 50% halo
              // alone reads 1.77:1. A solid ring keeps focus at 3:1.
              className="border-0 bg-background pl-9 shadow-light focus-visible:ring-2 focus-visible:ring-ring dark:bg-background [&::-webkit-search-cancel-button]:hidden"
            />
          </div>
        )}
      </div>
      {visibleNodes.length > 0 ? (
        // `-m-px p-px` here and on each subtree: both clip, and the active
        // row's outer `shadow-light` edge needs 1px past the row to show.
        <ul className="-m-px min-h-0 flex-1 overflow-y-auto p-px">
          {visibleNodes.map((node) => (
            <TagNavigationRow
              key={node.id}
              node={node}
              depth={0}
              filtering={query.trim().length > 0}
              pathname={pathname}
              expandedById={expandedById}
              setExpandedById={setExpandedById}
            />
          ))}
        </ul>
      ) : nodes.length > 0 ? (
        <p
          dir="auto"
          className="text-body-sm py-2 [overflow-wrap:anywhere] text-muted-foreground"
        >
          {t.shell.tagNav.noneFound(query)}
        </p>
      ) : null}
    </section>
  );
}

function TagNavigationRow({
  node,
  depth,
  filtering,
  pathname,
  expandedById,
  setExpandedById,
}: {
  node: TagNode;
  depth: number;
  filtering: boolean;
  pathname: string;
  expandedById: Record<string, boolean>;
  setExpandedById: Dispatch<SetStateAction<Record<string, boolean>>>;
}) {
  const t = useDictionary();
  const hasChildren = node.children.length > 0;
  const href = getTagHref(node);
  const active = pathname === href;
  // A non-empty query forces every subtree open so a deep match stays
  // reachable, without discarding the user's own collapse state -- clearing
  // the query restores whatever `expanded` already held.
  const expanded = expandedById[node.id] ?? pathname.startsWith(`${href}/`);
  const open = filtering || expanded;

  return (
    <li className="t-acc" data-open={open}>
      <div
        className={cn(
          // Same states as NavLink (Figma `all-button`): selection is the
          // raised fill, never hue alone.
          "flex h-8 min-w-0 items-center rounded-sm pr-1 transition-[background-color,box-shadow,color] duration-(--motion-fast) ease-out-muvuca motion-reduce:transition-none",
          active
            ? "bg-secondary text-foreground shadow-light inset-shadow-[0_0_0_999px] inset-shadow-light-1"
            : "text-muted-foreground focus-within:bg-light-2 focus-within:shadow-[inset_0_0_0_0.5px_var(--color-light-4),inset_0_1px_0_0_var(--color-light-2)] hover:bg-light-2 hover:shadow-[inset_0_0_0_0.5px_var(--color-light-4),inset_0_1px_0_0_var(--color-light-2)]",
        )}
      >
        {/* One 28px guide column per ancestor level, each with a 1px line
            centered on where that ancestor's chevron sits. The item's own
            chevron slot never gets a guide. Decorative and out of the tab
            order; the row's hover/active highlight still covers these
            columns because they live inside the same flex container. */}
        {Array.from({ length: depth }, (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            className="flex w-7 shrink-0 justify-center self-stretch"
          >
            <span className="w-px self-stretch bg-border" />
          </span>
        ))}
        {hasChildren ? (
          <button
            type="button"
            aria-expanded={open}
            // Named after `open`, not `expanded`: while a query forces a
            // collapsed branch open, a button labelled "Expandir" alongside
            // `aria-expanded="true"` contradicts itself.
            aria-label={
              open
                ? t.tags.tree.collapse(node.name)
                : t.tags.tree.expand(node.name)
            }
            onClick={() =>
              setExpandedById((current) => ({ ...current, [node.id]: !open }))
            }
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-[scale,color] duration-(--motion-fast) ease-out-muvuca hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.97] motion-reduce:active:scale-100"
          >
            <span className="t-acc-chevron">
              <ChevronDownIcon aria-hidden="true" className="size-3.5" />
            </span>
          </button>
        ) : (
          <span aria-hidden="true" className="size-7 shrink-0" />
        )}
        <Link
          href={href}
          title={node.name}
          aria-current={active ? "page" : undefined}
          className={cn(
            // No ring offset inside the tree: the subtree clips its own
            // overflow while expanding, and an offset ring on the first or
            // last row would be shaved by that clip.
            "group/taglink text-body-lg flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 transition-[scale,color] duration-(--motion-fast) ease-out-muvuca focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.97] motion-reduce:active:scale-100",
            active ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-2 shrink-0 rounded-full transition-transform duration-(--motion-fast) ease-out-muvuca group-hover/taglink:scale-125 motion-reduce:transition-none motion-reduce:group-hover/taglink:scale-100",
              swatchClassFor(node.colorToken),
            )}
          />
          <span dir="auto" className="truncate">
            {node.name}
          </span>
        </Link>
      </div>
      {hasChildren && (
        // `grid-template-rows: 0fr -> 1fr` is the one way to transition to a
        // content-driven height. The subtree stays mounted so the browser has
        // something to animate, and `inert` keeps the collapsed rows out of
        // the tab order and the accessibility tree.
        <div className="t-acc-panel">
          <ul className="t-acc-panel-inner -m-px p-px" inert={!open}>
            {node.children.map((child) => (
              <TagNavigationRow
                key={child.id}
                node={child}
                depth={depth + 1}
                filtering={filtering}
                pathname={pathname}
                expandedById={expandedById}
                setExpandedById={setExpandedById}
              />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
