import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/library",
}));

const { NavLink } = await import("./NavLink");

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

async function renderNavLink(item: Parameters<typeof NavLink>[0]["item"]) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<NavLink item={item} />);
  });
  return container;
}

describe("NavLink", () => {
  it("renderiza rótulo, href e contador", async () => {
    const view = await renderNavLink({
      label: "Todos os itens",
      href: "/library",
      count: 1040,
    });

    const link = view.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/library");
    expect(link?.textContent).toContain("Todos os itens");
    expect(link?.textContent).toContain("1040");
  });

  it("marca a rota atual com aria-current", async () => {
    const view = await renderNavLink({
      label: "Todos os itens",
      href: "/library",
    });

    expect(view.querySelector("a")?.getAttribute("aria-current")).toBe("page");
  });

  it("não marca aria-current em outra rota", async () => {
    const view = await renderNavLink({ label: "Tags", href: "/tags" });

    expect(view.querySelector("a")?.getAttribute("aria-current")).toBeNull();
  });

  it("renderiza sem ícone quando nenhum é passado", async () => {
    const view = await renderNavLink({
      label: "Todos os itens",
      href: "/library",
    });

    expect(view.querySelector("svg")).toBeNull();
  });

  it("esconde o contador quando count é undefined", async () => {
    const view = await renderNavLink({
      label: "Todos os itens",
      href: "/library",
    });

    expect(view.querySelector("[data-slot='nav-count']")).toBeNull();
  });

  it("mostra zero em vez de esconder o contador", async () => {
    const view = await renderNavLink({
      label: "Todos os itens",
      href: "/library",
      count: 0,
    });

    expect(view.querySelector("[data-slot='nav-count']")?.textContent).toBe(
      "0",
    );
  });
});
