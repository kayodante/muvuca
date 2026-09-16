import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TagNode } from "@/lib/tags/tree";
import { TagTree } from "./TagTree";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

const nodes: TagNode[] = [
  {
    id: "dev",
    parentId: null,
    name: "Dev",
    colorToken: "lime",
    description: null,
    children: [
      {
        id: "frontend",
        parentId: "dev",
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
        actions={{
          onCreateChild: vi.fn(),
          onEdit: vi.fn(),
          onDelete: vi.fn(),
        }}
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
      node.querySelector('a[href="/tags/frontend"]')?.closest("ul");

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
          actions={{
            onCreateChild: vi.fn(),
            onEdit: vi.fn(),
            onDelete: vi.fn(),
          }}
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
      node.querySelector('a[href="/tags/frontend"]')?.closest("ul");

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
          actions={{
            onCreateChild: vi.fn(),
            onEdit: vi.fn(),
            onDelete: vi.fn(),
          }}
        />,
      );
    });

    expect(subtreeOf(dom)?.hasAttribute("inert")).toBe(true);
  });
});
