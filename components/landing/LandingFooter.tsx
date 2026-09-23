"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { LanguageSelect } from "@/components/settings/LanguageSelect";
import { useDictionary, useLocale } from "@/lib/i18n/client";

/**
 * Logged-out visitors have no saved preference to read `LanguageSelect`'s
 * locale from, so this uses the client-side `useLocale()` (cookie/
 * Accept-Language resolved by the root layout, mirrored into context) same
 * as everywhere else `LanguageSelect` is used.
 */
export function LandingFooter() {
  const t = useDictionary();
  const locale = useLocale();

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
            {t.landing.footer.tagline}
          </p>
        </div>

        <nav
          className="text-body-sm flex flex-wrap items-center gap-6 text-muted-foreground"
          aria-label={t.landing.footer.navAriaLabel}
        >
          <a
            href="#inicio"
            className="transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground motion-reduce:transition-none"
          >
            {t.landing.nav.home}
          </a>
          <a
            href="#visao"
            className="transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground motion-reduce:transition-none"
          >
            {t.landing.nav.overview}
          </a>
          <a
            href="#tag-rollup"
            className="transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground motion-reduce:transition-none"
          >
            {t.landing.nav.tags}
          </a>
          <a
            href="#busca"
            className="transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground motion-reduce:transition-none"
          >
            {t.landing.nav.search}
          </a>
          <a
            href="#importacao"
            className="transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground motion-reduce:transition-none"
          >
            {t.landing.nav.import}
          </a>
          <Link
            href="/login"
            className="transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground motion-reduce:transition-none"
          >
            {t.landing.common.login}
          </Link>
          <Link
            href="/library"
            className="transition-colors duration-(--motion-fast) ease-out-muvuca hover:text-foreground motion-reduce:transition-none"
          >
            {t.landing.common.library}
          </Link>
          <LanguageSelect locale={locale} />
        </nav>
      </div>

      <div className="text-metadata mx-auto mt-8 max-w-[1440px] border-t border-border px-4 pt-6 text-muted-foreground sm:px-6 lg:px-8">
        <span>{t.landing.footer.copyright(new Date().getFullYear())}</span>
      </div>
    </footer>
  );
}
