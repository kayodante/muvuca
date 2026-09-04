import type { Metadata } from "next";
import { fontVariables } from "@/lib/fonts";
import { getOptionalUser } from "@/lib/auth/require-user";
import { getThemePreference } from "@/lib/database/queries/preferences";
import { DEFAULT_THEME } from "@/lib/theme/preference";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Muvuca",
  description: "Biblioteca pessoal de links e prompts.",
  // Ícones vêm das convenções de arquivo do App Router (app/icon.svg,
  // app/icon.png, app/apple-icon.png) e do app/manifest.ts.
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getOptionalUser();
  const theme = user ? await getThemePreference() : DEFAULT_THEME;
  // "system" applies no class: app/globals.css falls back to
  // `prefers-color-scheme` for it, so there is no client-side theme flash.
  const themeClass = theme === "system" ? undefined : theme;

  return (
    <html
      lang="pt-BR"
      className={`${fontVariables} ${themeClass ?? ""}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
