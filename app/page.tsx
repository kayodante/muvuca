import { connection } from "next/server";
import { LandingPage } from "@/components/landing/LandingPage";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export default async function HomePage() {
  // Every route in this app is dynamic by design: the nonce-based CSP from
  // `proxy.ts` only applies to dynamically rendered pages.
  await connection();

  const [dictionary, locale] = await Promise.all([
    getDictionary(),
    getLocale(),
  ]);

  return (
    // Landing page is dark-only (no light variant); `dark` here forces the
    // dark tokens regardless of OS preference or any user theme setting.
    <div className="dark flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/30 selection:text-foreground">
      <LandingPage copy={dictionary.landing} locale={locale} />
    </div>
  );
}
