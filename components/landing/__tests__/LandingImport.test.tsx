import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { LandingImport } from "@/components/landing/LandingImport";

describe("LandingImport", () => {
  it("renders the bookmarks import headline and architectural flow diagram", () => {
    const markup = renderToStaticMarkup(<LandingImport />);
    expect(markup).toContain(
      "Traga seus favoritos sem perder a estrutura de pastas.",
    );
    expect(markup).toContain(
      "Importe os favoritos do navegador e transforme pastas e subpastas",
    );
    expect(markup).toContain("Favoritos do Navegador");
    expect(markup).toContain("Estrutura de Tags no Muvuca");
    expect(markup).toContain("O arquivo é processado localmente");
  });
});
