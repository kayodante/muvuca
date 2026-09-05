import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TagAncestor } from "@/lib/database/queries/tags";

/**
 * Ancestry without becoming a second heavy nav.
 * More than 3 intermediate ancestors collapse to an ellipsis on every
 * viewport (not just mobile) -- the max tree depth is 6, so this can only
 * ever hide root-adjacent levels, never the immediate parent or the current
 * tag, and it keeps the trail from wrapping onto multiple lines.
 */
export function Breadcrumb({
  ancestors,
  currentName,
}: {
  ancestors: TagAncestor[];
  currentName: string;
}) {
  const MAX_VISIBLE_ANCESTORS = 3;
  const collapsed = ancestors.length > MAX_VISIBLE_ANCESTORS;
  const visible = collapsed
    ? ancestors.slice(ancestors.length - MAX_VISIBLE_ANCESTORS)
    : ancestors;
  const hidden = collapsed
    ? ancestors.slice(0, ancestors.length - MAX_VISIBLE_ANCESTORS)
    : [];

  return (
    <nav aria-label="Caminho da tag" className="min-w-0">
      <ol className="text-body-sm flex min-w-0 flex-wrap items-center gap-1 text-muted-foreground">
        <li>
          <Link
            href="/tags"
            className="inline-flex min-h-11 items-center rounded px-0.5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Tags
          </Link>
        </li>
        {collapsed && (
          <li className="flex min-w-0 items-center gap-1">
            <Separator />
            <span aria-hidden="true">…</span>
            <span className="sr-only">
              Tags intermediárias: {hidden.map((tag) => tag.name).join(", ")}
            </span>
          </li>
        )}
        {visible.map((ancestor) => (
          <li key={ancestor.id} className="flex min-w-0 items-center gap-1">
            <Separator />
            <Link
              href={`/tags/${ancestor.id}`}
              title={ancestor.name}
              dir="auto"
              className="inline-flex min-h-11 max-w-[12rem] items-center truncate rounded px-0.5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:max-w-xs"
            >
              {ancestor.name}
            </Link>
          </li>
        ))}
        <li className="flex min-w-0 items-center gap-1">
          <Separator />
          <span
            dir="auto"
            aria-current="page"
            className={cn(
              "max-w-[12rem] truncate font-medium text-foreground sm:max-w-xs",
            )}
          >
            {currentName}
          </span>
        </li>
      </ol>
    </nav>
  );
}

function Separator() {
  return (
    <ChevronRightIcon
      aria-hidden="true"
      className="size-3.5 shrink-0 text-primary"
    />
  );
}
