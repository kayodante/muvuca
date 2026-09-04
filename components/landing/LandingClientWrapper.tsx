"use client";

import { useState, type ReactNode } from "react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingProblem } from "@/components/landing/LandingProblem";
import { LandingGalleryOverview } from "@/components/landing/LandingGalleryOverview";
import { LandingTagRollup } from "@/components/landing/LandingTagRollup";
import { LandingSearchDemo } from "@/components/landing/LandingSearchDemo";
import { LandingItemTypes } from "@/components/landing/LandingItemTypes";
import { LandingImport } from "@/components/landing/LandingImport";
import { LandingCollections } from "@/components/landing/LandingCollections";
import { LandingCommandPalette } from "@/components/landing/LandingCommandPalette";

interface LandingClientWrapperProps {
  /**
   * Seções estáticas renderizadas no servidor e injetadas como `ReactNode`.
   * Importá-las aqui dentro as arrastaria para o bundle do cliente sem motivo:
   * nenhuma das duas tem estado próprio.
   */
  cta: ReactNode;
  footer: ReactNode;
}

export function LandingClientWrapper({
  cta,
  footer,
}: LandingClientWrapperProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      {/* Skip link for keyboard accessibility (WCAG 2.2 AA) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-md focus:ring-2 focus:ring-ring focus:outline-none"
      >
        Pular para o conteúdo principal
      </a>

      <LandingHeader onOpenSearch={() => setSearchOpen(true)} />

      <main id="main-content" className="flex-1">
        <LandingHero onOpenSearch={() => setSearchOpen(true)} />
        <LandingProblem />
        <LandingGalleryOverview />
        <LandingTagRollup />
        <LandingSearchDemo onOpenCommandPalette={() => setSearchOpen(true)} />
        <LandingItemTypes />
        <LandingImport />
        <LandingCollections />
        {cta}
      </main>

      {footer}

      <LandingCommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
