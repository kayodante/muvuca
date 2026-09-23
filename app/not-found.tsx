import Link from "next/link";
import { getDictionary } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getDictionary();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-headline-md">
        {t.states.error.boundary.notFound.title}
      </h1>
      <p className="text-body-sm max-w-sm text-muted-foreground">
        {t.states.error.boundary.notFound.message}
      </p>
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href="/library" />}
      >
        {t.states.error.boundary.notFound.backToLibrary}
      </Button>
    </main>
  );
}
