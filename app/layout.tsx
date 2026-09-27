import type { Metadata } from "next";
import { fontVariables } from "@/lib/fonts";
import { getOptionalUser } from "@/lib/auth/require-user";
import { getUserPreferences } from "@/lib/database/queries/preferences";
import { DEFAULT_THEME } from "@/lib/theme/preference";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { LocaleProvider } from "@/lib/i18n/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Announcer } from "@/components/states/Announcer";
import { ThemeTransitionGuard } from "@/components/shell/ThemeTransitionGuard";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: { default: t.metadata.title, template: `%s · ${t.metadata.title}` },
    description: t.metadata.description,
    // O favicon segue o tema do navegador (`media`), não a preferência salva
    // no app: é a barra de abas que ele precisa contrastar. Com `icons`
    // declarado, o Next descarta os ícones por convenção de arquivo
    // (app/icon.png, app/apple-icon.png), então o apple-icon entra aqui
    // também. Ele e o app/manifest.ts não aceitam `media`: um arquivo só.
    icons: {
      apple: "/apple-icon.png",
      icon: (["light", "dark"] as const).flatMap((scheme) =>
        [16, 32].map((size) => ({
          url: `/brand/favicon-${scheme}-${size}.png`,
          sizes: `${size}x${size}`,
          type: "image/png",
          media: `(prefers-color-scheme: ${scheme})`,
        })),
      ),
    },
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
          <Announcer />
        </LocaleProvider>
        <ThemeTransitionGuard />
      </body>
    </html>
  );
}
