import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TagNode } from "@/lib/tags/tree";
import { TagTree } from "./TagTree";

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const onSelect = vi.fn();

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.clearAllMocks();
});

const nodes: TagNode[] = [
  {
    id: "dev",
    parentId: null,
    path: "dev",
    name: "Dev",
    colorToken: "lime",
    description: null,
    children: [
      {
        id: "frontend",
        parentId: "dev",
        path: "dev/frontend",
        name: "Frontend",
        colorToken: "cyan",
        description: null,
        children: [],
      },
    ],
  },
];

async function renderTagTree(filtering = false) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <TagTree
        nodes={nodes}
        filtering={filtering}
        selectedId={null}
        onSelect={onSelect}
      />,
    );
  });
  return container;
}

describe("TagTree", () => {
  it("usa os hooks de acordeão sem remover a árvore recolhida da navegação", async () => {
    const dom = await renderTagTree();

    const toggle = dom.querySelector(
      'button[aria-label="Recolher Dev"]',
    ) as HTMLButtonElement;
    const accordion = toggle.closest("li");
    expect(accordion?.classList.contains("t-acc")).toBe(true);
    expect(accordion?.querySelector(".t-acc-panel-inner")).not.toBeNull();

    await act(async () => {
      toggle.click();
    });

    expect(accordion?.getAttribute("data-open")).toBe("false");
    expect(accordion?.querySelector("ul")?.hasAttribute("inert")).toBe(true);
  });

  it("filtrar com um ramo recolhido mantém o descendente que combina alcançável", async () => {
    const dom = await renderTagTree();
    const subtreeOf = (node: ParentNode) =>
      node.querySelector('[data-tag-row="frontend"]')?.closest("ul");

    const toggle = dom.querySelector(
      'button[aria-label="Recolher Dev"]',
    ) as HTMLButtonElement;
    await act(async () => {
      toggle.click();
    });
    expect(subtreeOf(dom)?.hasAttribute("inert")).toBe(true);

    await act(async () => {
      root?.render(
        <TagTree
          nodes={nodes}
          filtering
          selectedId={null}
          onSelect={onSelect}
        />,
      );
    });

    expect(subtreeOf(dom)?.hasAttribute("inert")).toBe(false);
    // O botão não pode se anunciar como "Expandir" enquanto aria-expanded="true".
    const reopened = dom.querySelector('button[aria-label="Recolher Dev"]');
    expect(reopened?.getAttribute("aria-expanded")).toBe("true");
  });

  it("limpar a busca devolve o ramo ao estado recolhido pelo usuário", async () => {
    const dom = await renderTagTree(true);
    const subtreeOf = (node: ParentNode) =>
      node.querySelector('[data-tag-row="frontend"]')?.closest("ul");

    const toggle = dom.querySelector(
      'button[aria-label="Recolher Dev"]',
    ) as HTMLButtonElement;
    await act(async () => {
      toggle.click();
    });
    // Enquanto a busca está ativa o ramo segue aberto, apesar do clique.
    expect(subtreeOf(dom)?.hasAttribute("inert")).toBe(false);

    await act(async () => {
      root?.render(
        <TagTree
          nodes={nodes}
          filtering={false}
          selectedId={null}
          onSelect={onSelect}
        />,
      );
    });

    expect(subtreeOf(dom)?.hasAttribute("inert")).toBe(true);
  });

  it("seleciona a tag pelo botão da linha e marca a selecionada", async () => {
    const dom = await renderTagTree();
    const row = dom.querySelector(
      '[data-tag-row="frontend"]',
    ) as HTMLButtonElement;

    await act(async () => row.click());
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "frontend" }),
    );

    await act(async () => {
      root?.render(
        <TagTree
          nodes={nodes}
          filtering={false}
          selectedId="frontend"
          onSelect={onSelect}
        />,
      );
    });
    expect(row.getAttribute("aria-pressed")).toBe("true");
    expect(
      dom.querySelector('[data-tag-row="dev"]')?.getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("no modo seleção cada linha vira um checkbox rotulado pelo nome", async () => {
    const onToggleChecked = vi.fn();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <TagTree
          nodes={nodes}
          filtering={false}
          selectedId={null}
          onSelect={onSelect}
          checked={new Set(["frontend"])}
          onToggleChecked={onToggleChecked}
        />,
      );
    });

    const boxes = container.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    expect(boxes).toHaveLength(2);
    expect(boxes[1]?.closest("label")?.textContent).toBe("Frontend");
    expect(boxes[1]?.checked).toBe(true);
    expect(container.querySelector("[data-tag-row]")).toBeNull();

    await act(async () => boxes[0]?.click());
    expect(onToggleChecked).toHaveBeenCalledWith(
      expect.objectContaining({ id: "dev" }),
    );
  });
});
