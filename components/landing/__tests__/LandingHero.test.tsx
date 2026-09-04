import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { LandingHero } from "@/components/landing/LandingHero";

describe("LandingHero", () => {
  it("renders the main H1 headline, subheadline and CTAs", () => {
    const markup = renderToStaticMarkup(<LandingHero />);
    expect(markup).toContain("Organize a muvuca que você salva na internet.");
    expect(markup).toContain(
      "Links e prompts organizados numa biblioteca visual",
    );
    expect(markup).toContain('href="/login"');
    expect(markup).toContain('href="#demo"');
    expect(markup).toContain("Começar");
    expect(markup).toContain("Ver como funciona");
  });
});
