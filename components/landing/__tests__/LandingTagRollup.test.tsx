import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { LandingTagRollup } from "@/components/landing/LandingTagRollup";

describe("LandingTagRollup", () => {
  it("renders the tag rollup headline, description and tag tree", () => {
    const markup = renderToStaticMarkup(<LandingTagRollup />);
    expect(markup).toContain(
      "Organize uma vez e encontre por qualquer caminho depois.",
    );
    expect(markup).toContain(
      "Ao abrir uma tag pai, o Muvuca reúne automaticamente os itens de toda a hierarquia",
    );
    expect(markup).toContain("Skills");
    expect(markup).toContain("Design");
    expect(markup).toContain("Desenvolvimento");
    expect(markup).toContain("Linear — Issue tracking for high-velocity teams");
  });
});
