"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function TagsError({ reset }: { reset: () => void }) {
  return (
    <ErrorState
      title="Não foi possível abrir a lista de tags"
      message="Tente carregar as tags novamente."
      onRetry={reset}
    />
  );
}
