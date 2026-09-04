import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { LandingItemTypes } from "@/components/landing/LandingItemTypes";

describe("LandingItemTypes", () => {
  it("renders the links and prompts side-by-side comparison", () => {
    const markup = renderToStaticMarkup(<LandingItemTypes />);
    expect(markup).toContain("Links e prompts convivem no mesmo acervo.");
    expect(markup).toContain("Link de Referência");
    expect(markup).toContain("Prompt de IA &amp; Instrução");
    expect(markup).toContain("linear.app");
    expect(markup).toContain("Copiar prompt");
    expect(markup).toContain("Abrir link");
  });
});
