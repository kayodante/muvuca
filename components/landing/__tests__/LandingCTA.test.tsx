import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { LandingCTA } from "@/components/landing/LandingCTA";

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
});
