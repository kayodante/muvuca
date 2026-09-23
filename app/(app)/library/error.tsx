"use client";

import { useDictionary } from "@/lib/i18n/client";
import { ErrorState } from "@/components/states/ErrorState";

export default function LibraryError({ reset }: { reset: () => void }) {
  const t = useDictionary();
  return (
    <ErrorState
      title={t.states.error.boundary.library.title}
      message={t.states.error.boundary.library.message}
      onRetry={reset}
    />
  );
}
