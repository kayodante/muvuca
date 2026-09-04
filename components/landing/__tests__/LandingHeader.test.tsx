import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { LandingHeader } from "@/components/landing/LandingHeader";

describe("LandingHeader", () => {
  it("renders the official logo and navigation links", () => {
    const markup = renderToStaticMarkup(<LandingHeader />);
    expect(markup).toContain('href="/"');
    expect(markup).toContain("Visão geral");
    expect(markup).toContain("Tags");
    expect(markup).not.toContain("Tag Rollup");
    expect(markup).toContain("Busca");
    expect(markup).toContain("Importação");
    expect(markup).toContain('href="/login"');
    expect(markup).toContain("Entrar");
    expect(markup).toContain("Começar");
    expect(markup).not.toContain("Começar agora");
  });
});
