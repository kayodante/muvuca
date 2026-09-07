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

const tagsWithGrandchild: FlatTag[] = [
  ...tags,
  {
    id: "react",
    parentId: "frontend",
    name: "React",
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

  it("filtrar com um ramo recolhido ainda mostra o descendente que combina", async () => {
    const dom = await renderTagNavigation(tags);

    const toggle = dom.querySelector(
      'button[aria-label="Recolher Dev"]',
    ) as HTMLButtonElement;
    expect(toggle).not.toBeNull();
    await act(async () => {
      toggle.click();
    });

    const input = dom.querySelector('input[type="search"]') as HTMLInputElement;
    await act(async () => {
      setInputValue(input, "front");
    });

    expect(tagLinks(dom)).toEqual(["Dev", "Frontend"]);
    const subtree = dom
      .querySelector('a[href="/tags/frontend"]')
      ?.closest("ul");
    expect(subtree?.hasAttribute("inert")).toBe(false);
  });

  it("expõe o acordeão da árvore com o estado aberto sincronizado ao botão", async () => {
    const dom = await renderTagNavigation(tags);
    const toggle = dom.querySelector(
      'button[aria-label="Recolher Dev"]',
    ) as HTMLButtonElement;
    const accordion = toggle.closest("li");

    expect(accordion?.classList.contains("t-acc")).toBe(true);
    expect(accordion?.getAttribute("data-open")).toBe("true");
    expect(accordion?.querySelector(".t-acc-panel")).not.toBeNull();
    expect(accordion?.querySelector(".t-acc-panel-inner")).not.toBeNull();

    await act(async () => {
      toggle.click();
    });

    expect(accordion?.getAttribute("data-open")).toBe("false");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("renderiza uma guia por nível de ancestral, e nenhuma na raiz", async () => {
    const dom = await renderTagNavigation(tagsWithGrandchild);

    const rootLink = dom.querySelector('a[href="/tags/design"]');
    const depth1Link = dom.querySelector('a[href="/tags/frontend"]');
    const depth2Link = dom.querySelector('a[href="/tags/react"]');

    // Each row's guides live in its own flex container, alongside its
    // chevron and link — the nested <ul> of children sits outside that
    // container, so counting within the link's parent never picks up a
    // descendant row's guides.
    expect(rootLink?.parentElement?.querySelectorAll(".bg-border").length).toBe(
      0,
    );
    expect(
      depth1Link?.parentElement?.querySelectorAll(".bg-border").length,
    ).toBe(1);
    expect(
      depth2Link?.parentElement?.querySelectorAll(".bg-border").length,
    ).toBe(2);
  });
});
