import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Answers "what do I do now?" -- title + optional description + one or two
 * actions, no illustration. Feature call sites (empty library, empty tag,
 * search with no results) each bring their own copy and actions; this is
 * the shared shell.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center",
        className,
      )}
    >
      {Icon && (
        <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <Icon aria-hidden="true" className="size-5" />
        </span>
      )}
      <p
        dir="auto"
        className="text-headline-sm [overflow-wrap:anywhere] break-words text-foreground"
      >
        {title}
      </p>
      {description && (
        <p
          dir="auto"
          className="text-body-sm max-w-sm [overflow-wrap:anywhere] break-words text-muted-foreground"
        >
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
