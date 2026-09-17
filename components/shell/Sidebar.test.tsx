import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/settings",
}));

vi.mock("./TagNavigation", () => ({
  TagNavigation: () => <nav data-testid="tag-navigation" />,
}));

vi.mock("./SidebarUserMenu", () => ({
  SidebarUserMenu: () => <div data-testid="user-menu" />,
}));

vi.mock("./ThemeToggle", () => ({
  ThemeToggle: () => <button type="button">tema</button>,
}));

// A Sidebar tem DOIS links para /library: a marca no header e esta row.
// Mockar o Logo deixa claro qual é qual nas asserções abaixo.
vi.mock("@/components/brand/Logo", () => ({
  Logo: () => <span data-testid="logo">Muvuca</span>,
}));

const { Sidebar } = await import("./Sidebar");

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

async function renderSidebar(itemsCount?: number) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <Sidebar
        theme="dark"
        userEmail="a@b.com"
        signOutSlot={null}
        itemsCount={itemsCount}
      />,
    );
  });
  return container;
}

describe("Sidebar", () => {
  it("mostra a row de todos os itens com o total", async () => {
    const view = await renderSidebar(1040);

    const count = view.querySelector("[data-slot='nav-count']");
    expect(count?.textContent).toBe("1040");
    // Ancorar pelo contador, não por `a[href='/library']`: o link da marca
    // aponta para o mesmo href e casaria com o seletor.
    const link = count?.closest("a");
    expect(link?.getAttribute("href")).toBe("/library");
    expect(link?.textContent).toContain("Todos os itens");
  });

  it("mantém a row acima do tag navigation", async () => {
    const view = await renderSidebar(3);

    const row = view.querySelector("[data-slot='nav-count']");
    const tags = view.querySelector("[data-testid='tag-navigation']");
    expect(row).not.toBeNull();
    expect(tags).not.toBeNull();
    // compareDocumentPosition: 4 === FOLLOWING (tags vem depois da row)
    expect(row!.compareDocumentPosition(tags!) & 4).toBe(4);
  });

  it("renderiza a row mesmo sem contador", async () => {
    const view = await renderSidebar(undefined);

    expect(view.textContent).toContain("Todos os itens");
    expect(view.querySelector("[data-slot='nav-count']")).toBeNull();
  });
});
