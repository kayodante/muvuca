import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-background py-12 text-foreground">
      <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-8 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo variant="full" size="md" />
          </Link>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            O que você guarda continua fácil de achar.
          </p>
        </div>

        <nav
          className="text-body-sm flex flex-wrap items-center gap-6 text-muted-foreground"
          aria-label="Rodapé"
        >
          <a
            href="#inicio"
            className="transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground motion-reduce:transition-none"
          >
            Início
          </a>
          <a
            href="#visao"
            className="transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground motion-reduce:transition-none"
          >
            Visão geral
          </a>
          <a
            href="#tag-rollup"
            className="transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground motion-reduce:transition-none"
          >
            Tags
          </a>
          <a
            href="#busca"
            className="transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground motion-reduce:transition-none"
          >
            Busca
          </a>
          <a
            href="#importacao"
            className="transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground motion-reduce:transition-none"
          >
            Importação
          </a>
          <Link
            href="/login"
            className="transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground motion-reduce:transition-none"
          >
            Entrar
          </Link>
          <Link
            href="/library"
            className="transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground motion-reduce:transition-none"
          >
            Biblioteca
          </Link>
        </nav>
      </div>

      <div className="text-metadata mx-auto mt-8 max-w-[1440px] border-t border-border px-4 pt-6 text-muted-foreground sm:px-6 lg:px-8">
        <span>
          © {new Date().getFullYear()} Muvuca. Todos os direitos reservados.
        </span>
      </div>
    </footer>
  );
}
