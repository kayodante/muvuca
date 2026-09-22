"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, MoreHorizontalIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { swatchClassFor } from "@/lib/tags/colors";
import { indentClassFor } from "@/lib/tags/indent";
import type { TagNode } from "@/lib/tags/tree";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type TagTreeActions = {
  onCreateChild: (parent: TagNode) => void;
  onEdit: (tag: TagNode) => void;
  onDelete: (tag: TagNode) => void;
};

/**
 * Short consistent indentation, chevron only on nodes with children,
 * swatch + name, row actions behind a menu rather than permanent icons.
 * Drag-and-drop is intentionally not supported (moving a tag uses
 * TagEditor's parent picker instead).
 */
export function TagTree({
  nodes,
  activeTagId,
  filtering,
  actions,
}: {
  nodes: TagNode[];
  activeTagId?: string;
  /** True while a tag filter is active, so no match hides inside a collapsed branch. */
  filtering: boolean;
  actions: TagTreeActions;
}) {
  if (nodes.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-0.5">
      {nodes.map((node) => (
        <TagTreeRow
          key={node.id}
          node={node}
          depth={0}
          activeTagId={activeTagId}
          filtering={filtering}
          actions={actions}
        />
      ))}
    </ul>
  );
}

function TagTreeRow({
  node,
  depth,
  activeTagId,
  filtering,
  actions,
}: {
  node: TagNode;
  depth: number;
  activeTagId?: string;
  filtering: boolean;
  actions: TagTreeActions;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isActive = node.id === activeTagId;
  // Same rule as TagNavigation: a non-empty query forces every subtree open so
  // a deep match stays visible and tabbable, without discarding the user's own
  // collapse state -- clearing the query restores whatever `expanded` held.
  const open = filtering || expanded;

  return (
    <li className="t-acc" data-open={open}>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md py-1 pr-1 transition-colors duration-(--motion-fast) ease-out-muvuca focus-within:bg-secondary/60 hover:bg-secondary/60",
          indentClassFor(depth),
          isActive && "bg-secondary",
        )}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={open}
            // Named after `open`, not `expanded`: while a query forces a
            // collapsed branch open, a button labelled "Expandir" alongside
            // `aria-expanded="true"` contradicts itself.
            aria-label={
              open ? `Recolher ${node.name}` : `Expandir ${node.name}`
            }
            className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span className="t-acc-chevron">
              <ChevronDownIcon aria-hidden="true" className="size-3.5" />
            </span>
          </button>
        ) : (
          <span className="size-6 shrink-0" aria-hidden="true" />
        )}

        <Link
          href={`/tags/${node.id}`}
          aria-current={isActive || undefined}
          className={cn(
            "group/tagitem text-label-md flex min-w-0 flex-1 items-center gap-2 rounded px-1.5 py-1 transition-[transform,color] duration-(--motion-fast) ease-out-muvuca focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.98] motion-reduce:active:scale-100",
            isActive
              ? "font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-2 shrink-0 rounded-full transition-transform duration-(--motion-fast) ease-out-muvuca group-hover/tagitem:scale-125 motion-reduce:transition-none motion-reduce:group-hover/tagitem:scale-100",
              swatchClassFor(node.colorToken),
            )}
          />
          <span dir="auto" className="truncate">
            {node.name}
          </span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 opacity-100 transition-[opacity,transform] duration-(--motion-fast) ease-out-muvuca focus-visible:opacity-100 active:scale-90 motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-focus-within:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100"
              />
            }
          >
            <MoreHorizontalIcon aria-hidden="true" />
            <span className="sr-only">Ações da tag {node.name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => actions.onCreateChild(node)}>
              Criar tag filha
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => actions.onEdit(node)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => actions.onDelete(node)}
            >
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {hasChildren && (
        // See TagNavigation: 0fr -> 1fr is what makes a content-driven height
        // animatable, and `inert` keeps the collapsed rows unreachable.
        <div className="t-acc-panel">
          <ul className="t-acc-panel-inner flex flex-col gap-0.5" inert={!open}>
            {node.children.map((child) => (
              <TagTreeRow
                key={child.id}
                node={child}
                depth={depth + 1}
                activeTagId={activeTagId}
                filtering={filtering}
                actions={actions}
              />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
