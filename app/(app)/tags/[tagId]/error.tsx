"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function TagError({ reset }: { reset: () => void }) {
  return (
    <ErrorState
      title="Não foi possível abrir esta tag"
      message="Tente carregar a hierarquia e os itens novamente."
      onRetry={reset}
    />
  );
}
