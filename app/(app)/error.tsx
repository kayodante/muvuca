"use client";

import { ErrorState } from "@/components/states/ErrorState";

/**
 * Error boundary for the whole `(app)` layout. Without it,
 * a transient failure in `getTagList`/`getThemePreference` -- both run in
 * `app/(app)/layout.tsx` before any page renders -- bubbles past this
 * segment straight to the generic root `app/error.tsx`, showing "Algo deu
 * errado" instead of a recoverable, specific message. Same pattern as
 * `library/error.tsx` and `tags/[tagId]/error.tsx`.
 */
export default function AppError({ reset }: { reset: () => void }) {
  return (
    <ErrorState
      title="Não foi possível carregar sua conta"
      message="Tente novamente em alguns segundos."
      onRetry={reset}
    />
  );
}
