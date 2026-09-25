import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const { replaceMock, searchParamsState, openSpotlightMock } = vi.hoisted(
  () => ({
    replaceMock: vi.fn(),
    searchParamsState: { current: new URLSearchParams() },
    openSpotlightMock: vi.fn(),
  }),
);

vi.mock("next/navigation", () => ({
  usePathname: () => "/items",
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  useSearchParams: () => searchParamsState.current,
}));

vi.mock("@/components/spotlight", () => ({
  useSpotlight: () => ({
    isOpen: false,
    setIsOpen: vi.fn(),
    openSpotlight: openSpotlightMock,
    closeSpotlight: vi.fn(),
  }),
}));

/**
 * jsdom implements no Web Animations API. The no-op below only exists so the
 * property is there to spy on -- `vi.restoreAllMocks()` puts this back between
 * tests, which a bare assignment to the prototype would not.
 */
Element.prototype.animate = (() => {
  throw new Error("Element.animate stub was called without a spy in place");
}) as unknown as Element["animate"];

const { LibrarySearch } = await import("./LibrarySearch");

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.clearAllMocks();
  vi.useRealTimers();
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

function setInputValue(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
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

  it("abre o spotlight ao clicar no botão de atalho de teclado", async () => {
    const dom = await renderLibrarySearch();
    const button = dom.querySelector(
      'button[aria-label="Abrir busca rápida (Spotlight)"]',
    ) as HTMLButtonElement;
    expect(button).not.toBeNull();

    await act(async () => {
      button.click();
    });

    expect(openSpotlightMock).toHaveBeenCalled();
  });

  it("exibe o botão de limpar busca quando há texto digitado e limpa o valor ao clicar", async () => {
    const animate = vi.spyOn(Element.prototype, "animate").mockReturnValue({
      cancel: vi.fn(),
      onfinish: null,
    } as unknown as Animation);
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
    expect(animate).toHaveBeenCalledTimes(3);
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

  it("interrompe a animação de limpar ao digitar", async () => {
    const cancel = vi.fn();
    vi.spyOn(Element.prototype, "animate").mockReturnValue({
      cancel,
      onfinish: null,
    } as unknown as Animation);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      font: "",
      measureText: (text: string) => ({ width: text.length * 8 }),
    } as CanvasRenderingContext2D);
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({ matches: false }),
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
      setInputValue(input, "b");
    });

    const clear = input.closest(".t-clear");
    expect(clear?.classList.contains("is-clearing")).toBe(false);
    expect(clear?.querySelector(".t-clear-mirror")?.textContent).toBe("");
    expect(cancel).toHaveBeenCalledTimes(3);
  });

  it("removes q after clearing, typing, and emptying the search", async () => {
    vi.useFakeTimers();
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
      setInputValue(input, "abc");
      vi.advanceTimersByTime(250);
    });
    expect(replaceMock).toHaveBeenLastCalledWith("/items?q=abc", {
      scroll: false,
    });

    await act(async () => {
      setInputValue(input, "");
      vi.advanceTimersByTime(250);
    });
    expect(replaceMock).toHaveBeenLastCalledWith("/items", { scroll: false });
  });
});
