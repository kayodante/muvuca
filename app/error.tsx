"use client";

import { Button } from "@/components/ui/button";

/**
 * Root error boundary. Never renders the raw error message/stack — only a
 * generic, human-readable notice.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-medium">Algo deu errado</h1>
      <p className="text-sm text-muted-foreground">
        Não foi possível concluir essa ação. Tente novamente.
      </p>
      <Button variant="outline" onClick={reset}>
        Tentar novamente
      </Button>
    </main>
  );
}
