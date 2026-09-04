import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-headline-md">Página não encontrada</h1>
      <p className="text-body-sm max-w-sm text-muted-foreground">
        Verifique o endereço ou volte para a sua biblioteca.
      </p>
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href="/library" />}
      >
        Ir para a biblioteca
      </Button>
    </main>
  );
}
