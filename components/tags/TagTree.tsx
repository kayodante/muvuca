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
  actions,
}: {
  nodes: TagNode[];
  activeTagId?: string;
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
  actions,
}: {
  node: TagNode;
  depth: number;
  activeTagId?: string;
  actions: TagTreeActions;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isActive = node.id === activeTagId;

  return (
    <li className="t-acc" data-open={expanded}>
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
            aria-expanded={expanded}
            aria-label={
              expanded ? `Recolher ${node.name}` : `Expandir ${node.name}`
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
            "text-label-md flex min-w-0 flex-1 items-center gap-2 rounded px-1.5 py-1 transition-colors duration-(--motion-fast) ease-out-muvuca focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            isActive
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

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 opacity-100 transition-opacity duration-(--motion-fast) ease-out-muvuca focus-visible:opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
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
          <ul
            className="t-acc-panel-inner flex flex-col gap-0.5"
            inert={!expanded}
          >
            {node.children.map((child) => (
              <TagTreeRow
                key={child.id}
                node={child}
                depth={depth + 1}
                activeTagId={activeTagId}
                actions={actions}
              />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
