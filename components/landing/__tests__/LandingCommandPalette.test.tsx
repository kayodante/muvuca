import { act } from "react";
import { createRoot } from "react-dom/client";
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
    expect(markup).toContain("t-modal");
    expect(markup).not.toContain("is-open");
  });

  it("applies is-open on the animation frame after mounting", () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    let frame: FrameRequestCallback | undefined;
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        frame = callback;
        return 1;
      }),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() =>
      root.render(<LandingCommandPalette open onOpenChange={vi.fn()} />),
    );

    const modal = container.querySelector(".t-modal");
    expect(modal?.classList.contains("is-open")).toBe(false);

    act(() => frame?.(performance.now()));
    expect(modal?.classList.contains("is-open")).toBe(true);

    act(() => root.unmount());
    vi.unstubAllGlobals();
  });

  it("renders null when closed", () => {
    const handleOpenChange = vi.fn();
    const markup = renderToStaticMarkup(
      <LandingCommandPalette open={false} onOpenChange={handleOpenChange} />,
    );

    expect(markup).toBe("");
  });
});
