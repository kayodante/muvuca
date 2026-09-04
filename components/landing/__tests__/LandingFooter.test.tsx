import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { LandingFooter } from "@/components/landing/LandingFooter";

describe("LandingFooter", () => {
  it("renders the footer with logo, tagline and real links", () => {
    const markup = renderToStaticMarkup(<LandingFooter />);
    expect(markup).toContain("O que você guarda continua fácil de achar.");
    expect(markup).toContain('href="/login"');
    expect(markup).toContain('href="/library"');
    expect(markup).toContain("Entrar");
    expect(markup).toContain("Biblioteca");
  });

  it("does not render decorative compliance or shortcut strips", () => {
    const markup = renderToStaticMarkup(<LandingFooter />);
    expect(markup).not.toContain("WCAG");
    expect(markup).not.toContain("Spotlight");
    expect(markup).not.toContain("•");
  });
});
