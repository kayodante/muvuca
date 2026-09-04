"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { swatchClassFor } from "@/lib/tags/colors";
import { indentClassFor } from "@/lib/tags/indent";
import { buildTagTree, type FlatTag, type TagNode } from "@/lib/tags/tree";

/** Compact, navigation-only tag tree for the persistent app shell. */
export function TagNavigation({ tags }: { tags: FlatTag[] }) {
  const nodes = buildTagTree(tags);

  if (nodes.length === 0) return null;

  return (
    <section
      aria-labelledby="sidebar-tags-heading"
      className="flex min-h-0 flex-1 flex-col"
    >
      <h2
        id="sidebar-tags-heading"
        // Sans, not mono: this is a navigation section label, and Geist Mono
        // is reserved for URLs, counters and timestamps.
        className="text-label-md mb-2 px-2 tracking-wide text-muted-foreground uppercase"
      >
        Tags
      </h2>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {nodes.map((node) => (
          <TagNavigationRow key={node.id} node={node} depth={0} />
        ))}
      </ul>
    </section>
  );
}

function TagNavigationRow({ node, depth }: { node: TagNode; depth: number }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const active = pathname === `/tags/${node.id}`;

  return (
    <li>
      <div
        className={cn(
          "flex min-w-0 items-center rounded-md pr-1 focus-within:bg-secondary/60 hover:bg-secondary/60",
          indentClassFor(depth),
          active && "bg-secondary",
        )}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={
              expanded ? `Recolher ${node.name}` : `Expandir ${node.name}`
            }
            onClick={() => setExpanded((value) => !value)}
            className="flex size-7 shrink-0 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ChevronRightIcon
              aria-hidden="true"
              className={cn(
                "size-3.5 transition-transform duration-(--motion-base) ease-out-muvuca motion-reduce:transition-none",
                expanded && "rotate-90",
              )}
            />
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
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-(--motion-base) ease-out-muvuca motion-reduce:transition-none",
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <ul className="overflow-hidden" inert={!expanded}>
            {node.children.map((child) => (
              <TagNavigationRow key={child.id} node={child} depth={depth + 1} />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
