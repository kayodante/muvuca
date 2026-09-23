"use client";

import { useDictionary } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";

/**
 * Root error boundary. Never renders the raw error message/stack — only a
 * generic, human-readable notice. Renders inside the root layout's
 * `<LocaleProvider>` (it only replaces `{children}`, not the layout
 * itself), so `useDictionary()` resolves the request's real locale here.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useDictionary();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-medium">
        {t.states.error.boundary.root.title}
      </h1>
      <p className="text-sm text-muted-foreground">
        {t.states.error.boundary.root.message}
      </p>
      <Button variant="outline" onClick={reset}>
        {t.common.tryAgain}
      </Button>
    </main>
  );
}
