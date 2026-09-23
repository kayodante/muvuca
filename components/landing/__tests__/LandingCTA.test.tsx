import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { LandingCTA } from "@/components/landing/LandingCTA";
import { LocaleProvider } from "@/lib/i18n/client";

describe("LandingCTA", () => {
  it("renders the final CTA headline and action link to /login", () => {
    const markup = renderToStaticMarkup(<LandingCTA />);
    expect(markup).toContain("Transforme sua muvuca em uma biblioteca.");
    expect(markup).toContain(
      "Guarde o que importa sem depender da memória para encontrar depois.",
    );
    expect(markup).toContain('href="/login"');
    expect(markup).toContain("Começar");
    expect(markup).not.toContain("Começar agora");
  });

  it("renders in English under a LocaleProvider set to en", () => {
    const markup = renderToStaticMarkup(
      <LocaleProvider locale="en">
        <LandingCTA />
      </LocaleProvider>,
    );
    expect(markup).toContain("Turn your muvuca into a library.");
    expect(markup).toContain(
      "Keep what matters without relying on memory to find it later.",
    );
    expect(markup).toContain('href="/login"');
    expect(markup).toContain("Get started");
    expect(markup).not.toContain("Começar");
  });
});
