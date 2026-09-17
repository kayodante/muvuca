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

  it("liga o input ao listbox por aria-activedescendant e move o alvo com as setas", () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    act(() =>
      root.render(<LandingCommandPalette open onOpenChange={vi.fn()} />),
    );

    const input = container.querySelector("input[type='text']");
    const listbox = container.querySelector("[role='listbox']");
    const options = [...container.querySelectorAll("[role='option']")];

    expect(input).not.toBeNull();
    expect(listbox).not.toBeNull();
    expect(options.length).toBeGreaterThan(1);

    // O input é o combobox; o listbox é o popup que ele controla.
    expect(input?.getAttribute("role")).toBe("combobox");
    expect(input?.getAttribute("aria-expanded")).toBe("true");
    expect(input?.getAttribute("aria-autocomplete")).toBe("list");
    expect(input?.getAttribute("aria-controls")).toBe(listbox?.id);
    expect(listbox?.id).toBeTruthy();

    // Toda opção tem id, e o alvo inicial é a primeira.
    for (const option of options) {
      expect(option.id).toBeTruthy();
    }
    expect(input?.getAttribute("aria-activedescendant")).toBe(options[0]?.id);
    expect(options[0]?.getAttribute("aria-selected")).toBe("true");

    // ArrowDown move o alvo anunciado, não só o destaque visual.
    act(() => {
      input?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
    });

    expect(input?.getAttribute("aria-activedescendant")).toBe(options[1]?.id);
    expect(options[1]?.getAttribute("aria-selected")).toBe("true");

    act(() => root.unmount());
    container.remove();
  });

  it("marca o painel como o diálogo, não o backdrop", () => {
    const markup = renderToStaticMarkup(
      <LandingCommandPalette open onOpenChange={vi.fn()} />,
    );
    const dialogTag = markup.match(/<div[^>]*role="dialog"[^>]*>/)?.[0] ?? "";

    expect(dialogTag).toContain('aria-modal="true"');
    expect(dialogTag).toContain("t-modal");
    // O backdrop é fixed inset-0; o diálogo não pode ser ele.
    expect(dialogTag).not.toContain("inset-0");
  });
});
