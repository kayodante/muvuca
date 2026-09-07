import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const { replaceMock, searchParamsState } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  searchParamsState: { current: new URLSearchParams() },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/items",
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  useSearchParams: () => searchParamsState.current,
}));

const { LibrarySearch } = await import("./LibrarySearch");

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.clearAllMocks();
  searchParamsState.current = new URLSearchParams();
  document.documentElement.classList.remove("dark");
  vi.restoreAllMocks();
});

async function renderLibrarySearch() {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<LibrarySearch />);
  });
  return container;
}

describe("LibrarySearch", () => {
  it("renderiza o input de busca e o badge de atalho quando vazio", async () => {
    const dom = await renderLibrarySearch();
    const input = dom.querySelector('input[type="search"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe("");

    const kbd = dom.querySelector("kbd");
    expect(kbd).not.toBeNull();
    expect(kbd?.textContent).toMatch(/(⌘K|Ctrl\+K)/);

    const clearButton = dom.querySelector('button[aria-label="Limpar busca"]');
    expect(clearButton).toBeNull();
  });

  it("foca e seleciona o input de busca ao pressionar o atalho global (Cmd+K / Ctrl+K)", async () => {
    const dom = await renderLibrarySearch();
    const input = dom.querySelector('input[type="search"]') as HTMLInputElement;
    expect(input).not.toBeNull();

    const focusSpy = vi.spyOn(input, "focus");
    const selectSpy = vi.spyOn(input, "select");

    await act(async () => {
      const event = new KeyboardEvent("keydown", {
        key: "k",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(event);
    });

    expect(focusSpy).toHaveBeenCalled();
    expect(selectSpy).toHaveBeenCalled();
  });

  it("exibe o botão de limpar busca quando há texto digitado e limpa o valor ao clicar", async () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      font: "",
      measureText: (text: string) => ({ width: text.length * 8 }),
    } as CanvasRenderingContext2D);
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({ matches: false }),
    });
    document.documentElement.classList.add("dark");
    searchParamsState.current = new URLSearchParams("q=react");
    const dom = await renderLibrarySearch();
    const input = dom.querySelector('input[type="search"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe("react");

    const kbd = dom.querySelector("kbd");
    expect(kbd).toBeNull();

    const clearButton = dom.querySelector(
      'button[aria-label="Limpar busca"]',
    ) as HTMLButtonElement;
    expect(clearButton).not.toBeNull();
    const clear = input.closest(".t-clear");
    expect(clear?.classList.contains("has-value")).toBe(true);
    expect(clear?.querySelector(".t-clear-mirror")).not.toBeNull();
    expect(clear?.querySelector(".t-clear-placeholder")).not.toBeNull();
    expect(clear?.querySelector(".t-clear-glow")).not.toBeNull();

    const focusSpy = vi.spyOn(input, "focus");

    await act(async () => {
      clearButton.click();
    });

    expect(input.value).toBe("");
    expect(clear?.classList.contains("is-clearing")).toBe(true);
    expect(clear?.querySelector(".t-clear-mirror")?.textContent).toBe("react");
    expect(
      (clear?.querySelector(".t-clear-glow") as HTMLElement).style.background,
    ).toContain("255, 255, 255");
    expect(frames.length).toBeGreaterThan(0);
    expect(focusSpy).toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledWith("/items", { scroll: false });
    expect(replaceMock).toHaveBeenCalledTimes(1);
  });

  it("limpa sem frames quando reduced motion está ativo", async () => {
    const requestFrame = vi.spyOn(window, "requestAnimationFrame");
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({ matches: true }),
    });
    searchParamsState.current = new URLSearchParams("q=react");
    const dom = await renderLibrarySearch();
    const input = dom.querySelector('input[type="search"]') as HTMLInputElement;

    await act(async () => {
      (
        dom.querySelector(
          'button[aria-label="Limpar busca"]',
        ) as HTMLButtonElement
      ).click();
    });

    expect(input.value).toBe("");
    expect(input.closest(".t-clear")?.classList.contains("is-clearing")).toBe(
      false,
    );
    expect(requestFrame).not.toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledTimes(1);
  });
});
