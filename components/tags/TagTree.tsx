"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { swatchClassFor } from "@/lib/tags/colors";
import { indentClassFor } from "@/lib/tags/indent";
import type { TagNode } from "@/lib/tags/tree";
import { useDictionary } from "@/lib/i18n/client";

type TagTreeProps = {
  nodes: TagNode[];
  /** True while a tag filter is active, so no match hides inside a collapsed branch. */
  filtering: boolean;
  selectedId: string | null;
  onSelect: (node: TagNode) => void;
};

/**
 * The /tags workspace tree. A row *selects* its tag for the inspector;
 * going to a tag's items lives in the sidebar and in the inspector's
 * "Abrir itens". Short consistent indentation, chevron only on nodes with
 * children, swatch + name. No drag-and-drop: moving uses the inspector's
 * parent picker.
 */
export function TagTree({ nodes, ...rowProps }: TagTreeProps) {
  if (nodes.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-0.5">
      {nodes.map((node) => (
        <TagTreeRow key={node.id} node={node} depth={0} {...rowProps} />
      ))}
    </ul>
  );
}

function TagTreeRow({
  node,
  depth,
  filtering,
  selectedId,
  onSelect,
}: Omit<TagTreeProps, "nodes"> & { node: TagNode; depth: number }) {
  const t = useDictionary();
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isSelected = node.id === selectedId;
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
          isSelected && "bg-secondary",
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
              open
                ? t.tags.tree.collapse(node.name)
                : t.tags.tree.expand(node.name)
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

        <button
          type="button"
          data-tag-row={node.id}
          aria-pressed={isSelected}
          onClick={() => onSelect(node)}
          className={cn(
            "group/tagitem text-label-md flex min-w-0 flex-1 items-center gap-2 rounded px-1.5 py-1 text-left transition-[transform,color] duration-(--motion-fast) ease-out-muvuca focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.98] motion-reduce:active:scale-100",
            isSelected
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
          {/* Selection is weight + background + this marker, never hue alone. */}
          {isSelected && (
            <span
              aria-hidden="true"
              className="ml-auto h-4 w-1 shrink-0 rounded-full bg-primary"
            />
          )}
        </button>
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
                filtering={filtering}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
