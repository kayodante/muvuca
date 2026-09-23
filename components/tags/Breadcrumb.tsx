import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TagAncestor } from "@/lib/database/queries/tags";
import { getTagHref } from "@/lib/tags/routes";
import { ptBR, type Dictionary } from "@/lib/i18n/dictionaries/pt-BR";

/**
 * Ancestry without becoming a second heavy nav.
 * More than 3 intermediate ancestors collapse to an ellipsis on every
 * viewport (not just mobile) -- the max tree depth is 6, so this can only
 * ever hide root-adjacent levels, never the immediate parent or the current
 * tag, and it keeps the trail from wrapping onto multiple lines.
 *
 * `t` is optional (default `ptBR`), not `useDictionary()`: this stays a
 * plain, provider-free component like `PromptContentPanel`, so its own
 * caller (`TagDetailView`, also provider-free) can pass the dictionary it
 * already resolved instead of standing up a client boundary just for this.
 */
export function Breadcrumb({
  ancestors,
  currentName,
  t = ptBR,
}: {
  ancestors: TagAncestor[];
  currentName: string;
  t?: Dictionary;
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
    <nav aria-label={t.tags.breadcrumb.ariaLabel} className="min-w-0">
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <li>
          <Link
            href="/tags"
            className="inline-flex h-5 items-center rounded px-0.5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {t.tags.breadcrumb.root}
          </Link>
        </li>
        {collapsed && (
          <li className="flex min-w-0 items-center gap-1">
            <Separator />
            <span aria-hidden="true">…</span>
            <span className="sr-only">
              {t.tags.breadcrumb.hiddenAncestors(
                hidden.map((tag) => tag.name).join(", "),
              )}
            </span>
          </li>
        )}
        {visible.map((ancestor) => (
          <li key={ancestor.id} className="flex min-w-0 items-center gap-1">
            <Separator />
            <Link
              href={getTagHref(ancestor)}
              title={ancestor.name}
              dir="auto"
              className="inline-flex h-5 max-w-[12rem] items-center truncate rounded px-0.5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:max-w-xs"
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
