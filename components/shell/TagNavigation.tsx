"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";

/** Compact, navigation-only tag tree for the persistent app shell. */
export function TagNavigation({ tags }: { tags: FlatTag[] }) {
  const nodes = buildTagTree(tags);
  const [query, setQuery] = useState("");

  if (nodes.length === 0) return null;

  const visibleNodes = filterTagTree(nodes, query);

  return (
    <section
      aria-labelledby="sidebar-tags-heading"
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="shrink-0">
        <h2
          id="sidebar-tags-heading"
          // Sans, not mono: this is a navigation section label, and Geist
          // Mono is reserved for URLs, counters and timestamps.
          className="text-label-md mb-2 px-2 tracking-wide text-muted-foreground uppercase"
        >
          Tags
        </h2>
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
            placeholder="Buscar tags"
            aria-label="Buscar tags por nome"
            className="pl-9 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
      </div>
      {visibleNodes.length > 0 ? (
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {visibleNodes.map((node) => (
            <TagNavigationRow
              key={node.id}
              node={node}
              depth={0}
              filtering={query.trim().length > 0}
            />
          ))}
        </ul>
      ) : (
        <p
          dir="auto"
          className="text-body-sm py-2 [overflow-wrap:anywhere] text-muted-foreground"
        >
          Nenhuma tag encontrada para “{query}”.
        </p>
      )}
    </section>
  );
}

function TagNavigationRow({
  node,
  depth,
  filtering,
}: {
  node: TagNode;
  depth: number;
  filtering: boolean;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const active = pathname === `/tags/${node.id}`;
  // A non-empty query forces every subtree open so a deep match stays
  // reachable, without discarding the user's own collapse state -- clearing
  // the query restores whatever `expanded` already held.
  const open = filtering || expanded;

  return (
    <li className="t-acc" data-open={open}>
      <div
        className={cn(
          "flex min-w-0 items-center rounded-md pr-1 focus-within:bg-secondary/60 hover:bg-secondary/60",
          active && "bg-secondary",
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
              open ? `Recolher ${node.name}` : `Expandir ${node.name}`
            }
            onClick={() => setExpanded((value) => !value)}
            className="flex size-7 shrink-0 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span className="t-acc-chevron">
              <ChevronDownIcon aria-hidden="true" className="size-3.5" />
            </span>
          </button>
        ) : (
          <span aria-hidden="true" className="size-7 shrink-0" />
        )}
        <Link
          href={`/tags/${node.id}`}
          aria-current={active ? "page" : undefined}
          className={cn(
            // No ring offset inside the tree: the subtree clips its own
            // overflow while expanding, and an offset ring on the first or
            // last row would be shaved by that clip.
            "text-label-md flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            active
              ? "font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-2 shrink-0 rounded-full",
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
          <ul className="t-acc-panel-inner" inert={!open}>
            {node.children.map((child) => (
              <TagNavigationRow
                key={child.id}
                node={child}
                depth={depth + 1}
                filtering={filtering}
              />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
