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

describe("TagTree", () => {
  it("usa os hooks de acordeão sem remover a árvore recolhida da navegação", async () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <TagTree
          nodes={nodes}
          actions={{
            onCreateChild: vi.fn(),
            onEdit: vi.fn(),
            onDelete: vi.fn(),
          }}
        />,
      );
    });

    const toggle = container.querySelector(
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
});
