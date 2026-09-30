import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FlatTag } from "@/lib/tags/tree";

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(() => "/library"),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

const { TagNavigation } = await import("./TagNavigation");

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  usePathnameMock.mockReturnValue("/library");
});

async function renderTagNavigation(
  tags: FlatTag[],
  counts?: Record<string, number>,
) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<TagNavigation tags={tags} counts={counts} />);
  });
  return container;
}

const tags: FlatTag[] = [
  {
    id: "design",
    parentId: null,
    path: "design",
    name: "Design",
    colorToken: "lime",
    description: null,
  },
  {
    id: "dev",
    parentId: null,
    path: "dev",
    name: "Dev",
    colorToken: "lime",
    description: null,
  },
  {
    id: "frontend",
    parentId: "dev",
    path: "dev/frontend",
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
    path: "dev/frontend/react",
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
  return Array.from(dom.querySelectorAll('a[href^="/t/"]')).map(
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

  it("anuncia o vazio numa região de status que já existia antes da busca", async () => {
    const dom = await renderTagNavigation(tags);
    const status = dom.querySelector('[role="status"]');
    const input = dom.querySelector('input[type="search"]') as HTMLInputElement;

    expect(status).not.toBeNull();
    expect(status?.textContent).toBe("");

    await act(async () => {
      setInputValue(input, "inexistente");
    });

    // Same node: a region remounted with its text would not be announced.
    expect(dom.querySelector('[role="status"]')).toBe(status);
    expect(status?.textContent).toBe(
      "Nenhuma tag encontrada para “inexistente”.",
    );
  });

  it("limpar busca no vazio restaura a árvore e devolve o foco ao campo", async () => {
    const dom = await renderTagNavigation(tags);
    const input = dom.querySelector('input[type="search"]') as HTMLInputElement;

    await act(async () => {
      setInputValue(input, "inexistente");
    });
    const clear = Array.from(dom.querySelectorAll("button")).find(
      (button) => button.textContent === "Limpar busca",
    );
    expect(clear).toBeDefined();

    await act(async () => {
      clear?.click();
    });

    expect(input.value).toBe("");
    expect(tagLinks(dom)).toEqual(["Design", "Dev", "Frontend"]);
    expect(document.activeElement).toBe(input);
    expect(dom.querySelector('[role="status"]')?.textContent).toBe("");
  });

  it("filtrar com um ramo recolhido ainda mostra o descendente que combina", async () => {
    const dom = await renderTagNavigation(tags);

    const toggle = dom.querySelector('button[aria-label="Expandir Dev"]');
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");

    const input = dom.querySelector('input[type="search"]') as HTMLInputElement;
    await act(async () => {
      setInputValue(input, "front");
    });

    expect(tagLinks(dom)).toEqual(["Dev", "Frontend"]);
    const subtree = dom
      .querySelector('a[href="/t/dev/frontend"]')
      ?.closest("ul");
    expect(subtree?.hasAttribute("inert")).toBe(false);
  });

  it("expõe o acordeão da árvore com o estado aberto sincronizado ao botão", async () => {
    const dom = await renderTagNavigation(tags);
    const toggle = dom.querySelector(
      'button[aria-label="Expandir Dev"]',
    ) as HTMLButtonElement;
    const accordion = toggle.closest("li");

    expect(accordion?.classList.contains("t-acc")).toBe(true);
    expect(accordion?.getAttribute("data-open")).toBe("false");
    expect(accordion?.querySelector(".t-acc-panel")).not.toBeNull();
    expect(accordion?.querySelector(".t-acc-panel-inner")).not.toBeNull();

    await act(async () => {
      toggle.click();
    });

    expect(accordion?.getAttribute("data-open")).toBe("true");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
  });

  it("opens the active path and retains a manually collapsed branch across navigation", async () => {
    usePathnameMock.mockReturnValue("/t/dev/frontend");
    const dom = await renderTagNavigation(tagsWithGrandchild);
    const dev = dom.querySelector('a[href="/t/dev"]')?.closest("li");
    expect(dev?.getAttribute("data-open")).toBe("true");

    await act(async () => {
      (dev?.querySelector("button") as HTMLButtonElement).click();
    });
    expect(dev?.getAttribute("data-open")).toBe("false");

    usePathnameMock.mockReturnValue("/t/dev/frontend/react");
    await act(async () =>
      root?.render(<TagNavigation tags={tagsWithGrandchild} />),
    );
    expect(dev?.getAttribute("data-open")).toBe("false");
    expect(
      dom.querySelector('a[href="/t/dev/frontend"]')?.getAttribute("title"),
    ).toBe("Frontend");
    usePathnameMock.mockReturnValue("/library");
  });

  it("shows tag management even when the library has no tags", async () => {
    const dom = await renderTagNavigation([]);
    expect(dom.querySelector('a[href="/tags"]')?.textContent).toBe(
      "Gerenciar tags",
    );
  });

  it("desenha um cotovelo por filho, sem tronco depois do último irmão", async () => {
    const dom = await renderTagNavigation(tagsWithGrandchild);

    const rootLink = dom.querySelector('a[href="/t/design"]');
    const depth1Link = dom.querySelector('a[href="/t/dev/frontend"]');
    const depth2Link = dom.querySelector('a[href="/t/dev/frontend/react"]');

    // Each row's guides live in its own flex container, alongside its
    // chevron and link — the nested <ul> of children sits outside that
    // container, so counting within the link's parent never picks up a
    // descendant row's guides.
    const count = (link: Element | null, selector: string) =>
      link?.parentElement?.querySelectorAll(selector).length;

    expect(count(rootLink, ".rounded-bl-md")).toBe(0);
    expect(count(depth1Link, ".rounded-bl-md")).toBe(1);
    expect(count(depth2Link, ".rounded-bl-md")).toBe(1);
    // Every row here is an only child, so no trunk continues past any elbow
    // and no ancestor column carries a line.
    expect(count(depth1Link, ".bg-muted-foreground\\/40")).toBe(0);
    expect(count(depth2Link, ".bg-muted-foreground\\/40")).toBe(0);
  });

  it("shows each tag's rollup count inside its link, 0 when absent from the map", async () => {
    const dom = await renderTagNavigation(tagsWithGrandchild, {
      dev: 12,
      frontend: 7,
      react: 7,
    });

    const countOf = (href: string) =>
      dom.querySelector(`a[href="${href}"] [data-slot="tag-count"]`)
        ?.textContent;
    expect(countOf("/t/design")).toBe("0");
    expect(countOf("/t/dev")).toBe("12");
    expect(countOf("/t/dev/frontend")).toBe("7");
    expect(countOf("/t/dev/frontend/react")).toBe("7");
  });

  it("renders no counter when the counts are unavailable", async () => {
    const dom = await renderTagNavigation(tags);

    expect(dom.querySelector('[data-slot="tag-count"]')).toBeNull();
  });

  it("links each tag to its friendly path and marks the current one", async () => {
    usePathnameMock.mockReturnValue("/t/dev/frontend");
    const dom = await renderTagNavigation(tags);

    const frontend = dom.querySelector('a[href="/t/dev/frontend"]');
    expect(frontend?.getAttribute("aria-current")).toBe("page");
    expect(
      dom.querySelector('a[href="/t/dev"]')?.getAttribute("aria-current"),
    ).toBeNull();
    expect(dom.querySelector('a[href^="/tags/"]')).toBeNull();

    usePathnameMock.mockReturnValue("/library");
  });
});
