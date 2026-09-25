import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ThemeTransitionGuard } from "./ThemeTransitionGuard";

const html = document.documentElement;
const nextFrame = () =>
  new Promise((resolve) => requestAnimationFrame(resolve));

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let schemeChange: (() => void) | null = null;

beforeEach(async () => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({
      addEventListener: (_type: string, listener: () => void) => {
        schemeChange = listener;
      },
      removeEventListener: () => {
        schemeChange = null;
      },
    }),
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<ThemeTransitionGuard />));
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  html.classList.remove("dark");
  html.removeAttribute("data-theme-switching");
});

describe("ThemeTransitionGuard", () => {
  it("suspende as transições enquanto a classe de tema troca e as devolve depois do paint", async () => {
    html.classList.add("dark");
    await Promise.resolve();
    expect(html.hasAttribute("data-theme-switching")).toBe(true);

    await nextFrame();
    await nextFrame();
    await nextFrame();
    expect(html.hasAttribute("data-theme-switching")).toBe(false);
  });

  it("também suspende quando a preferência de cor do SO muda", () => {
    schemeChange?.();
    expect(html.hasAttribute("data-theme-switching")).toBe(true);
  });
});
