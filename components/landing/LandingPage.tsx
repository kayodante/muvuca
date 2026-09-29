import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  ArrowDownIcon,
  PlusIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { LanguageSelect } from "@/components/settings/LanguageSelect";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { LandingHeader } from "./LandingHeader";
import { LandingFeatures } from "./LandingFeatures";
import { LandingMedia } from "./LandingMedia";
import styles from "./landing.module.css";

export function LandingPage({
  copy: t,
  locale,
}: {
  copy: Dictionary["landing"];
  locale: Locale;
}) {
  return (
    <div className={styles.page}>
      <a href="#main-content" className={styles.skipLink}>
        {t.skipToContent}
      </a>
      <LandingHeader />
      <main id="main-content" tabIndex={-1}>
        <section
          className={styles.hero}
          id="inicio"
          aria-labelledby="hero-title"
        >
          <Image
            src="/landing/landscape.webp"
            alt=""
            fill
            sizes="100vw"
            preload
            className={styles.heroLandscape}
          />
          <div className={styles.heroShade} aria-hidden="true" />
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span />
              {t.hero.eyebrow}
            </p>
            <h1 id="hero-title">{t.hero.title}</h1>
            <p className={styles.heroDescription}>{t.hero.subtitle}</p>
            <div className={styles.heroActions}>
              <Link href="/login" className={styles.primaryButton}>
                {t.common.getStarted}
                <ArrowUpRightIcon aria-hidden="true" size={17} />
              </Link>
              <a href="#recursos" className={styles.textLink}>
                {t.common.seeHow}
                <ArrowDownIcon aria-hidden="true" size={15} />
              </a>
            </div>
          </div>
          <div className={styles.heroProduct}>
            <LandingMedia
              number="01"
              label={t.media.pending}
              title={t.hero.assetTitle}
              description={t.hero.assetDescription}
              format={t.media.landscapeFormat}
            />
          </div>
          <Image
            src="/landing/foreground.webp"
            alt=""
            width={1536}
            height={1024}
            sizes="100vw"
            className={styles.heroForeground}
          />
          <div className={styles.heroFade} aria-hidden="true" />
        </section>

        <section
          id="sobre"
          className={`${styles.container} ${styles.intro}`}
          aria-labelledby="intro-title"
        >
          <p className={styles.sectionLabel}>{t.intro.label}</p>
          <div>
            <h2 id="intro-title">{t.intro.title}</h2>
            <p>{t.intro.body}</p>
            <span className={styles.introSignature}>{t.intro.signature}</span>
          </div>
        </section>

        <section
          id="recursos"
          className={`${styles.container} ${styles.section}`}
          aria-labelledby="features-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionLabel}>{t.features.label}</p>
              <h2 id="features-title">{t.features.title}</h2>
            </div>
            <p>{t.features.subtitle}</p>
          </div>
          <LandingFeatures />
        </section>

        <section
          id="como-funciona"
          className={`${styles.container} ${styles.section}`}
          aria-labelledby="details-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionLabel}>{t.details.label}</p>
              <h2 id="details-title">{t.details.title}</h2>
            </div>
            <p>{t.details.subtitle}</p>
          </div>
          <div className={styles.details}>
            {t.details.items.map((item) => (
              <article key={item.number} className={styles.detail}>
                <div className={styles.detailCopy}>
                  <p className={styles.sectionLabel}>{item.label}</p>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  <span className={styles.detailNote}>
                    <ArrowRightIcon size={16} aria-hidden="true" />
                    {item.note}
                  </span>
                </div>
                <LandingMedia
                  number={item.number}
                  label={t.media.pending}
                  title={item.assetTitle}
                  description={item.assetDescription}
                  format={t.media.detailFormat}
                  className={styles.detailMedia}
                />
              </article>
            ))}
          </div>
        </section>

        <section
          id="perguntas"
          className={`${styles.container} ${styles.faq}`}
          aria-labelledby="faq-title"
        >
          <div>
            <p className={styles.sectionLabel}>{t.faq.label}</p>
            <h2 id="faq-title">{t.faq.title}</h2>
            <p>{t.faq.subtitle}</p>
          </div>
          <div className={styles.faqList}>
            {t.faq.items.map((item) => (
              <details key={item.question}>
                <summary>
                  {item.question}
                  <PlusIcon aria-hidden="true" size={19} />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.closing} aria-labelledby="closing-title">
          <Image
            src="/landing/landscape.webp"
            alt=""
            fill
            sizes="100vw"
            className={styles.closingLandscape}
          />
          <div className={styles.closingCopy}>
            <Logo variant="symbol" size="xl" theme="light" />
            <h2 id="closing-title">{t.cta.title}</h2>
            <p>{t.cta.subtitle}</p>
            <Link href="/login" className={styles.primaryButton}>
              {t.common.getStarted}
              <ArrowUpRightIcon aria-hidden="true" size={17} />
            </Link>
          </div>
          <Image
            src="/landing/foreground.webp"
            alt=""
            width={1536}
            height={1024}
            sizes="100vw"
            className={styles.closingForeground}
          />
        </section>
      </main>

      <footer className={`${styles.container} ${styles.footer}`}>
        <div className={styles.footerTop}>
          <div>
            <Link href="/" aria-label="Muvuca">
              <Logo variant="full" size="lg" theme="light" />
            </Link>
            <p>{t.footer.tagline}</p>
          </div>
          <nav aria-label={t.footer.navAriaLabel}>
            <a href="#sobre">{t.nav.about}</a>
            <a href="#recursos">{t.nav.features}</a>
            <a href="#perguntas">{t.nav.faq}</a>
            <Link href="/login">
              {t.common.login}
              <ArrowUpRightIcon aria-hidden="true" size={15} />
            </Link>
          </nav>
        </div>
        <div className={styles.footerBottom}>
          <span>{t.footer.copyright(new Date().getFullYear())}</span>
          <div className={styles.locale}>
            <span>{t.footer.language}</span>
            <LanguageSelect locale={locale} popupClassName="dark" />
          </div>
        </div>
      </footer>
    </div>
  );
}
