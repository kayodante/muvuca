import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { LandingCommandPalette } from "@/components/landing/LandingCommandPalette";

describe("LandingCommandPalette", () => {
  it("renders search input, brand badge, tag filters and results when open", () => {
    const handleOpenChange = vi.fn();
    const markup = renderToStaticMarkup(
      <LandingCommandPalette open={true} onOpenChange={handleOpenChange} />,
    );

    expect(markup).toContain("MUVUCA SPOTLIGHT");
    expect(markup).toContain("Buscar links, prompts, domínios ou tags...");
    expect(markup).toContain("Filtrar por tag:");
    expect(markup).toContain("Linear — Issue tracking for high-velocity teams");
    expect(markup).toContain("System Prompt: Senior Code Reviewer");
    expect(markup).toContain("navegar");
    expect(markup).toContain("selecionar");
    expect(markup).toContain("fechar");
  });

  it("renders null when closed", () => {
    const handleOpenChange = vi.fn();
    const markup = renderToStaticMarkup(
      <LandingCommandPalette open={false} onOpenChange={handleOpenChange} />,
    );

    expect(markup).toBe("");
  });
});
