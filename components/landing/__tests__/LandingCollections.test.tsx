import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { LandingCollections } from "@/components/landing/LandingCollections";

describe("LandingCollections", () => {
  it("renders the collections headline and curated collection examples", () => {
    const markup = renderToStaticMarkup(<LandingCollections />);
    expect(markup).toContain("Você organiza cada coleção do seu jeito.");
    expect(markup).toContain("O Muvuca se molda ao seu acervo pessoal");
    expect(markup).toContain("Skills &amp; Engenharia");
    expect(markup).toContain("Design &amp; Direção de Arte");
    expect(markup).toContain("Prompts de IA");
    expect(markup).toContain("Lista de Desejos &amp; Wishlist");
  });
});
