import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const { setTheme } = vi.hoisted(() => ({ setTheme: vi.fn() }));

vi.mock("@/lib/actions/theme", () => ({ setTheme }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const { ThemeToggle } = await import("./ThemeToggle");

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("ThemeToggle", () => {
  it("mantém os ícones de tema empilhados nos hooks de troca", async () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<ThemeToggle theme="system" />);
    });

    expect(container.querySelectorAll(".t-icon-swap")).toHaveLength(3);
    expect(
      container.querySelector('.t-icon-swap[data-state="a"]'),
    ).not.toBeNull();
  });
});
