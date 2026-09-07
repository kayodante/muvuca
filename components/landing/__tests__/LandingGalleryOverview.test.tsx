import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { LandingGalleryOverview } from "@/components/landing/LandingGalleryOverview";

describe("LandingGalleryOverview", () => {
  it("renders the gallery overview headline and editorial content", () => {
    const markup = renderToStaticMarkup(<LandingGalleryOverview />);
    expect(markup).toContain(
      "Uma biblioteca que continua legível quando cresce.",
    );
    expect(markup).toContain("O Muvuca reúne seus itens em uma galeria visual");
    expect(markup).toContain("t-tabs");
    expect(markup).toContain("t-tabs-pill");
    expect(markup).toContain("t-tab");
  });

  it("does not render the redundant three-card callout bar", () => {
    const markup = renderToStaticMarkup(<LandingGalleryOverview />);
    expect(markup).not.toContain("Escaneabilidade rápida");
    expect(markup).not.toContain("Contexto sem rigidez");
    expect(markup).not.toContain("sm:grid-cols-3");
  });
});
