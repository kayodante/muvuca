"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function LibraryError({ reset }: { reset: () => void }) {
  return (
    <ErrorState
      title="Não foi possível abrir a biblioteca"
      message="Tente carregar seus itens novamente."
      onRetry={reset}
    />
  );
}
