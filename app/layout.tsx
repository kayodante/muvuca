import type { Metadata } from "next";
import { fontVariables } from "@/lib/fonts";
import { getOptionalUser } from "@/lib/auth/require-user";
import { getUserPreferences } from "@/lib/database/queries/preferences";
import { DEFAULT_THEME } from "@/lib/theme/preference";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { LocaleProvider } from "@/lib/i18n/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeTransitionGuard } from "@/components/shell/ThemeTransitionGuard";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: t.metadata.title,
    description: t.metadata.description,
    // Ícones vêm das convenções de arquivo do App Router (app/icon.svg,
    // app/icon.png, app/apple-icon.png) e do app/manifest.ts.
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, locale] = await Promise.all([getOptionalUser(), getLocale()]);
  const theme = user ? (await getUserPreferences()).theme : DEFAULT_THEME;
  // "system" applies no class: app/globals.css falls back to
  // `prefers-color-scheme` for it, so there is no client-side theme flash.
  const themeClass = theme === "system" ? undefined : theme;

  return (
    <html
      lang={locale}
      className={`${fontVariables} ${themeClass ?? ""}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <LocaleProvider locale={locale}>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </LocaleProvider>
        <ThemeTransitionGuard />
      </body>
    </html>
  );
}
