import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { LandingProblem } from "@/components/landing/LandingProblem";

describe("LandingProblem", () => {
  it("renders the 4 problem narrative pillars with exact copy and anchors", () => {
    const markup = renderToStaticMarkup(<LandingProblem />);
    expect(markup).toContain(
      "O trabalho real começa quando você esquece onde guardou",
    );
    expect(markup).toContain("Favoritos espalhados");
    expect(markup).toContain("Pastas que não acompanham sua cabeça");
    expect(markup).toContain("O esforço de busca supera o conteúdo");
    expect(markup).toContain("Recuperação imediata em qualquer contexto");
    expect(markup).toContain("t-panel-slide");
    expect(markup).toContain('data-open="true"');
  });

  it("does not render generic step-number labels", () => {
    const markup = renderToStaticMarkup(<LandingProblem />);
    for (const rotulo of [">01<", ">02<", ">03<", ">04<"]) {
      expect(markup).not.toContain(rotulo);
    }
  });

  it("does not render em-dashes in the browser-tab mocks", () => {
    const markup = renderToStaticMarkup(<LandingProblem />);
    expect(markup).not.toContain("—");
  });
});
