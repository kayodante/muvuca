"use client";

import { useDictionary } from "@/lib/i18n/client";
import { ErrorState } from "@/components/states/ErrorState";

export default function TagsError({ reset }: { reset: () => void }) {
  const t = useDictionary();
  return (
    <ErrorState
      title={t.states.error.boundary.tags.title}
      message={t.states.error.boundary.tags.message}
      onRetry={reset}
    />
  );
}
