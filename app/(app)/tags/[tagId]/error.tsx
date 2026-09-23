"use client";

import { useDictionary } from "@/lib/i18n/client";
import { ErrorState } from "@/components/states/ErrorState";

export default function TagError({ reset }: { reset: () => void }) {
  const t = useDictionary();
  return (
    <ErrorState
      title={t.states.error.boundary.tag.title}
      message={t.states.error.boundary.tag.message}
      onRetry={reset}
    />
  );
}
