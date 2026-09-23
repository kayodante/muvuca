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
import { useDictionary } from "@/lib/i18n/client";

interface LandingHeaderProps {
  onOpenSearch?: () => void;
}

export function LandingHeader({ onOpenSearch }: LandingHeaderProps) {
  const [open, setOpen] = useState(false);
  const t = useDictionary();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background">
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
          aria-label={t.landing.header.navAriaLabel}
        >
          <a
            href="#visao"
            className="text-body-sm text-muted-foreground transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground motion-reduce:transition-none"
          >
            {t.landing.nav.overview}
          </a>
          <a
            href="#tag-rollup"
            className="text-body-sm text-muted-foreground transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground motion-reduce:transition-none"
          >
            {t.landing.nav.tags}
          </a>
          <a
            href="#busca"
            className="text-body-sm text-muted-foreground transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground motion-reduce:transition-none"
          >
            {t.landing.nav.search}
          </a>
          <a
            href="#importacao"
            className="text-body-sm text-muted-foreground transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground motion-reduce:transition-none"
          >
            {t.landing.nav.import}
          </a>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 md:flex">
          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              className="text-metadata flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-2.5 py-1.5 text-muted-foreground transition-colors duration-(--motion-fast) ease-out-muvuca hover:bg-muted/50 hover:text-foreground motion-reduce:transition-none"
              aria-label={t.landing.header.openSpotlight}
            >
              <SearchIcon className="size-3.5" />
              <span>{t.landing.nav.search}</span>
              <kbd className="text-metadata rounded border border-border bg-background px-1 font-mono">
                ⌘K
              </kbd>
            </button>
          )}

          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            {t.landing.common.login}
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            {t.landing.common.getStarted}
          </Link>
        </div>

        {/* Mobile Menu */}
        <div className="flex items-center gap-2 md:hidden">
          {onOpenSearch && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onOpenSearch}
              aria-label={t.landing.header.openSearchMobile}
            >
              <SearchIcon className="size-4" />
            </Button>
          )}

          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            {t.landing.common.getStarted}
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t.landing.header.openMenu}
                />
              }
            >
              <MenuIcon className="size-5" aria-hidden="true" />
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col gap-6 pt-10">
              <SheetTitle className="sr-only">
                {t.landing.header.menuTitle}
              </SheetTitle>
              <SheetDescription className="sr-only">
                {t.landing.header.menuDescription}
              </SheetDescription>
              <nav
                className="flex flex-col gap-4"
                aria-label={t.landing.header.mobileNavAriaLabel}
              >
                <a
                  href="#visao"
                  onClick={() => setOpen(false)}
                  className="text-headline-sm transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-brand-accent motion-reduce:transition-none"
                >
                  {t.landing.nav.overview}
                </a>
                <a
                  href="#tag-rollup"
                  onClick={() => setOpen(false)}
                  className="text-headline-sm transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-brand-accent motion-reduce:transition-none"
                >
                  {t.landing.nav.tags}
                </a>
                <a
                  href="#busca"
                  onClick={() => setOpen(false)}
                  className="text-headline-sm transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-brand-accent motion-reduce:transition-none"
                >
                  {t.landing.nav.search}
                </a>
                <a
                  href="#importacao"
                  onClick={() => setOpen(false)}
                  className="text-headline-sm transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-brand-accent motion-reduce:transition-none"
                >
                  {t.landing.nav.import}
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
                  {t.landing.common.login}
                </Link>
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "w-full",
                  )}
                >
                  {t.landing.common.getStarted}
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
