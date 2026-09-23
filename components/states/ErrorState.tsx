"use client";

import { RefreshCwIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useDictionary } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";

/**
 * Short message, retry when safe, correlation ID only when useful for
 * support -- never a raw exception. Distinct from `AuthErrorState`, which
 * is a compact inline form banner,
 * not a full-region state; the two solve different layout problems, not
 * the same one twice.
 *
 * `title`/`retryLabel` default to the dictionary (not a literal) so every
 * call site that doesn't override them still renders in the active locale.
 */
export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel,
  correlationId,
  className,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  correlationId?: string;
  className?: string;
}) {
  const t = useDictionary();
  const resolvedTitle = title ?? t.states.error.genericTitle;
  const resolvedRetryLabel = retryLabel ?? t.common.tryAgain;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-6 py-10 text-center",
        className,
      )}
    >
      <p
        dir="auto"
        className="text-headline-sm [overflow-wrap:anywhere] break-words text-foreground"
      >
        {resolvedTitle}
      </p>
      {/* `text-foreground`, not `text-muted-foreground`: the destructive
          tint behind this card pulls the muted gray below the 4.5:1 AA
          contrast ratio. */}
      <p
        dir="auto"
        className="text-body-sm max-w-sm [overflow-wrap:anywhere] break-words text-foreground"
      >
        {message}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCwIcon aria-hidden="true" data-icon="inline-start" />
          {resolvedRetryLabel}
        </Button>
      )}
      {correlationId && (
        <p
          dir="auto"
          className="text-metadata [overflow-wrap:anywhere] break-words text-foreground/80"
        >
          ID: {correlationId}
        </p>
      )}
    </div>
  );
}
