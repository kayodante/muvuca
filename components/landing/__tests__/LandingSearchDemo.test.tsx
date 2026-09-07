import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { LandingSearchDemo } from "@/components/landing/LandingSearchDemo";

describe("LandingSearchDemo", () => {
  it("renders search headline, input placeholder, and results", () => {
    const markup = renderToStaticMarkup(<LandingSearchDemo />);
    expect(markup).toContain("Você não precisa lembrar onde salvou.");
    expect(markup).toContain(
      "Pesquise por título, domínio, descrição ou conteúdo",
    );
    expect(markup).toContain(
      "Buscar por título, domínio, descrição ou prompt...",
    );
    expect(markup).toContain("Minimal Gallery — Curated web");
    expect(markup).toContain("t-clear");
    expect(markup).toContain("has-value");
    expect(markup).toContain("t-clear-mirror");
    expect(markup).toContain("t-clear-placeholder");
    expect(markup).toContain("t-clear-glow");
  });
});
