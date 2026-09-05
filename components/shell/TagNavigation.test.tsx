import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FlatTag } from "@/lib/tags/tree";

vi.mock("next/navigation", () => ({
  usePathname: () => "/library",
}));

const { TagNavigation } = await import("./TagNavigation");

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

async function renderTagNavigation(tags: FlatTag[]) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<TagNavigation tags={tags} />);
  });
  return container;
}

const tags: FlatTag[] = [
  {
    id: "design",
    parentId: null,
    name: "Design",
    colorToken: "lime",
    description: null,
  },
  {
    id: "dev",
    parentId: null,
    name: "Dev",
    colorToken: "lime",
    description: null,
  },
  {
    id: "frontend",
    parentId: "dev",
    name: "Frontend",
    colorToken: "lime",
    description: null,
  },
];

function setInputValue(input: HTMLInputElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;
  nativeInputValueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function tagLinks(dom: HTMLDivElement) {
  return Array.from(dom.querySelectorAll('a[href^="/tags/"]')).map(
    (link) => link.textContent,
  );
}

describe("TagNavigation", () => {
  it("renderiza todas as tags quando a query está vazia", async () => {
    const dom = await renderTagNavigation(tags);

    expect(tagLinks(dom)).toEqual(["Design", "Dev", "Frontend"]);
  });

  it("digitar no campo filtra a lista, mantendo o ancestral de um filho que combina", async () => {
    const dom = await renderTagNavigation(tags);
    const input = dom.querySelector('input[type="search"]') as HTMLInputElement;
    expect(input).not.toBeNull();

    await act(async () => {
      setInputValue(input, "front");
    });

    // "Frontend" matches directly; "Dev" is its parent and must stay visible.
    expect(tagLinks(dom)).toEqual(["Dev", "Frontend"]);
  });

  it("query sem nenhum match mostra a mensagem de vazio e não renderiza linhas de tag", async () => {
    const dom = await renderTagNavigation(tags);
    const input = dom.querySelector('input[type="search"]') as HTMLInputElement;

    await act(async () => {
      setInputValue(input, "inexistente");
    });

    expect(tagLinks(dom)).toEqual([]);
    expect(dom.textContent).toContain(
      "Nenhuma tag encontrada para “inexistente”.",
    );
  });
});
