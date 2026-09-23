"use client";

import { useDictionary } from "@/lib/i18n/client";
import { ErrorState } from "@/components/states/ErrorState";

/**
 * Error boundary for the whole `(app)` layout. Without it,
 * a transient failure in `getTagList`/`getUserPreferences`/
 * `getLibraryItemsCount` -- all run in `app/(app)/layout.tsx` before any
 * page renders -- bubbles past this segment straight to the generic root
 * `app/error.tsx`, showing the generic boundary message instead of a
 * recoverable, specific one. Same pattern as `library/error.tsx` and
 * `tags/[tagId]/error.tsx`.
 */
export default function AppError({ reset }: { reset: () => void }) {
  const t = useDictionary();
  return (
    <ErrorState
      title={t.states.error.boundary.app.title}
      message={t.states.error.boundary.app.message}
      onRetry={reset}
    />
  );
}
