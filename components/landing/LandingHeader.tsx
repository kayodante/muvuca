"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { MenuIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface LandingHeaderProps {
  onOpenSearch?: () => void;
}

export function LandingHeader({ onOpenSearch }: LandingHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo variant="full" size="md" />
        </Link>

        {/* Desktop Nav */}
        <nav
          className="hidden items-center gap-8 md:flex"
          aria-label="Navegação Principal"
        >
          <a
            href="#visao"
            className="text-body-sm text-muted-foreground transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground motion-reduce:transition-none"
          >
            Visão geral
          </a>
          <a
            href="#tag-rollup"
            className="text-body-sm text-muted-foreground transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground motion-reduce:transition-none"
          >
            Tags
          </a>
          <a
            href="#busca"
            className="text-body-sm text-muted-foreground transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground motion-reduce:transition-none"
          >
            Busca
          </a>
          <a
            href="#importacao"
            className="text-body-sm text-muted-foreground transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground motion-reduce:transition-none"
          >
            Importação
          </a>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 md:flex">
          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              className="text-metadata flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-2.5 py-1.5 text-muted-foreground transition-colors duration-(--motion-fast) ease-out-muvuca hover:bg-muted/50 hover:text-foreground motion-reduce:transition-none"
              aria-label="Abrir Spotlight"
            >
              <SearchIcon className="size-3.5" />
              <span>Busca</span>
              <kbd className="text-metadata rounded border border-border bg-background px-1 font-mono">
                ⌘K
              </kbd>
            </button>
          )}

          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Entrar
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            Começar
          </Link>
        </div>

        {/* Mobile Menu */}
        <div className="flex items-center gap-2 md:hidden">
          {onOpenSearch && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onOpenSearch}
              aria-label="Abrir busca rápida"
            >
              <SearchIcon className="size-4" />
            </Button>
          )}

          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            Começar
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Abrir menu de navegação"
                />
              }
            >
              <MenuIcon className="size-5" aria-hidden="true" />
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col gap-6 pt-10">
              <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
              <SheetDescription className="sr-only">
                Links e ações da landing page
              </SheetDescription>
              <nav
                className="flex flex-col gap-4"
                aria-label="Navegação Mobile"
              >
                <a
                  href="#visao"
                  onClick={() => setOpen(false)}
                  className="text-headline-sm transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-brand-accent motion-reduce:transition-none"
                >
                  Visão geral
                </a>
                <a
                  href="#tag-rollup"
                  onClick={() => setOpen(false)}
                  className="text-headline-sm transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-brand-accent motion-reduce:transition-none"
                >
                  Tags
                </a>
                <a
                  href="#busca"
                  onClick={() => setOpen(false)}
                  className="text-headline-sm transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-brand-accent motion-reduce:transition-none"
                >
                  Busca
                </a>
                <a
                  href="#importacao"
                  onClick={() => setOpen(false)}
                  className="text-headline-sm transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-brand-accent motion-reduce:transition-none"
                >
                  Importação
                </a>
              </nav>
              <div className="mt-auto flex flex-col gap-3 border-t border-border pt-6">
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ variant: "secondary" }),
                    "w-full",
                  )}
                >
                  Entrar
                </Link>
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "w-full",
                  )}
                >
                  Começar
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
