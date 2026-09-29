"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRightIcon, MenuIcon } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useDictionary } from "@/lib/i18n/client";
import styles from "./landing.module.css";

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const { landing: t } = useDictionary();
  const links = [
    { href: "#sobre", label: t.nav.about },
    { href: "#recursos", label: t.nav.features },
    { href: "#como-funciona", label: t.nav.how },
    { href: "#perguntas", label: t.nav.faq },
  ];
  return (
    <header className={styles.header}>
      <div className={`${styles.container} ${styles.headerInner}`}>
        <Link href="/" aria-label="Muvuca">
          <Logo variant="full" size="md" theme="light" />
        </Link>
        <nav className={styles.desktopNav} aria-label={t.header.navAriaLabel}>
          {links.map((link) => (
            <a href={link.href} key={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <Link href="/login" className={styles.headerLogin}>
            {t.common.login}
          </Link>
          <Link href="/login" className={styles.headerCta}>
            {t.common.getStarted}
            <ArrowUpRightIcon aria-hidden="true" size={15} />
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t.header.openMenu}
                  className={styles.mobileMenu}
                />
              }
            >
              <MenuIcon aria-hidden="true" size={20} />
            </SheetTrigger>
            <SheetContent
              side="right"
              className="dark flex flex-col gap-6 bg-background px-6 pt-12 text-foreground"
            >
              <SheetTitle>{t.header.menuTitle}</SheetTitle>
              <SheetDescription className="sr-only">
                {t.header.menuDescription}
              </SheetDescription>
              <nav
                className={styles.mobileNav}
                aria-label={t.header.mobileNavAriaLabel}
              >
                {links.map((link) => (
                  <a
                    href={link.href}
                    key={link.href}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
                <Link href="/login">{t.common.login}</Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
