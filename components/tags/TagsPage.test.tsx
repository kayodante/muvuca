import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FlatTag } from "@/lib/tags/tree";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("@/lib/actions/tags", () => ({
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
  moveTags: vi.fn(),
  deleteTags: vi.fn(),
}));
vi.mock("@/lib/actions/export", () => ({
  exportTagLibrary: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { deleteTag } from "@/lib/actions/tags";
import { TagsPage, type TagsPageInitial } from "./TagsPage";

const TAGS: FlatTag[] = [
  {
    id: "design",
    parentId: null,
    path: "design",
    name: "Design",
    colorToken: "lime",
    description: null,
  },
  {
    id: "icons",
    parentId: "design",
    path: "design/icones",
    name: "Ícones",
    colorToken: "cyan",
    description: null,
  },
  {
    id: "dev",
    parentId: null,
    path: "dev",
    name: "Dev",
    colorToken: "blue",
    description: null,
  },
];

const NONE: TagsPageInitial = {
  tagPath: null,
  create: false,
  parentPath: null,
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  window.history.replaceState(null, "", "/tags");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  document.body.innerHTML = "";
  vi.resetAllMocks();
});

async function render(flatTags: FlatTag[], initial: TagsPageInitial = NONE) {
  await act(async () =>
    root?.render(<TagsPage flatTags={flatTags} initial={initial} />),
  );
}

const heading = () =>
  document.getElementById("tag-inspector-heading")?.textContent;
const row = (id: string) =>
  document.querySelector(`[data-tag-row="${id}"]`) as HTMLButtonElement;

function typeName(value: string) {
  const input = document.querySelector(
    'input[name="name"]',
  ) as HTMLInputElement;
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("TagsPage", () => {
  it("opens the inspector on the ?tag= path it was given", async () => {
    await render(TAGS, { ...NONE, tagPath: "design/icones" });

    expect(heading()).toBe("Ícones");
    expect(row("icons").getAttribute("aria-pressed")).toBe("true");
  });

  it("shows the empty inspector for an unknown path", async () => {
    await render(TAGS, { ...NONE, tagPath: "nao/existe" });

    expect(heading()).toBe("Nenhuma tag selecionada");
    expect(window.location.search).toBe("");
  });

  it("mirrors the selection into ?tag=", async () => {
    await render(TAGS);

    await act(async () => row("dev").click());

    expect(heading()).toBe("Dev");
    expect(new URLSearchParams(window.location.search).get("tag")).toBe("dev");
  });

  it("rename keeps selection: follows the tag by id when its path changes", async () => {
    await render(TAGS, { ...NONE, tagPath: "design/icones" });

    const renamed = TAGS.map((tag) =>
      tag.id === "icons"
        ? { ...tag, name: "Iconografia", path: "design/iconografia" }
        : tag,
    );
    await render(renamed, { ...NONE, tagPath: "design/icones" });

    expect(heading()).toBe("Iconografia");
    expect(new URLSearchParams(window.location.search).get("tag")).toBe(
      "design/iconografia",
    );
  });

  it("dirty guard: asks before discarding unsaved edits", async () => {
    await render(TAGS, { ...NONE, tagPath: "dev" });

    await act(async () => typeName("Dev renomeado"));
    await act(async () => row("design").click());

    const alert = document.querySelector('[role="alertdialog"]');
    expect(alert?.textContent).toContain("Descartar alterações?");
    expect(heading()).toBe("Dev");

    const discard = [...(alert?.querySelectorAll("button") ?? [])].find(
      (button) => button.textContent === "Descartar",
    );
    await act(async () => discard?.click());

    expect(heading()).toBe("Design");
  });

  it("re-selecting the current row while dirty is a no-op, not a discard", async () => {
    await render(TAGS, { ...NONE, tagPath: "dev" });

    await act(async () => typeName("Dev renomeado"));
    await act(async () => row("dev").click());

    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(heading()).toBe("Dev");
    expect(
      (document.querySelector('input[name="name"]') as HTMLInputElement).value,
    ).toBe("Dev renomeado");
  });

  it("opens create mode under the ?parent= path", async () => {
    await render(TAGS, { tagPath: null, create: true, parentPath: "design" });

    expect(heading()).toBe("Nova tag");
    const params = new URLSearchParams(window.location.search);
    expect(params.get("new")).toBe("1");
    expect(params.get("parent")).toBe("design");
  });

  it("selection mode swaps the inspector for the bulk panel", async () => {
    await render(TAGS, { ...NONE, tagPath: "dev" });

    const selectButton = [...document.querySelectorAll("button")].find(
      (b) => b.textContent === "Selecionar",
    );
    await act(async () => selectButton?.click());

    expect(document.getElementById("tag-inspector-heading")).toBeNull();
    expect(document.body.textContent).toContain(
      "Marque as tags que quer mover ou excluir.",
    );
    expect(new URLSearchParams(window.location.search).get("tag")).toBeNull();
    // Entering selection mode has no inspector heading to land on: focus
    // must not fall to <body>, it returns to the toggle that opened it.
    expect(document.activeElement).toBe(selectButton);

    const box = [
      ...document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
    ].find((input) => input.closest("label")?.textContent === "Design");
    await act(async () => box?.click());
    expect(document.body.textContent).toContain("1 tag selecionada");

    // The header toggle now reads "Cancelar seleção" too -- exclude it to
    // reach the panel's own cancel button specifically.
    const panelCancel = [...document.querySelectorAll("button")].find(
      (b) => b.textContent === "Cancelar seleção" && b !== selectButton,
    );
    await act(async () => panelCancel?.click());
    expect(document.getElementById("tag-inspector-heading")).not.toBeNull();
    expect(document.activeElement).toBe(selectButton);
  });

  it("a single delete from the inspector focuses the empty-state heading", async () => {
    vi.mocked(deleteTag).mockResolvedValue({ ok: true, data: null });
    await render(TAGS, { ...NONE, tagPath: "dev" });

    const menuButton = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Mais ações para Dev"),
    ) as HTMLButtonElement;
    await act(async () => menuButton.click());

    expect(
      [...document.body.querySelectorAll('[role="menuitem"]')].some(
        (item) => item.textContent === "Exportar JSON da tag",
      ),
    ).toBe(true);

    const deleteItem = [
      ...document.body.querySelectorAll('[role="menuitem"]'),
    ].find((el) => el.textContent === "Excluir") as HTMLElement;
    await act(async () => deleteItem.click());

    const alert = document.querySelector('[role="alertdialog"]');
    const confirm = [...(alert?.querySelectorAll("button") ?? [])].find(
      (b) => b.textContent === "Excluir tag",
    );
    await act(async () => confirm?.click());

    expect(heading()).toBe("Nenhuma tag selecionada");
    expect(document.activeElement?.id).toBe("tag-inspector-heading");
  });

  it("'Abrir itens' with unsaved edits asks before navigating away", async () => {
    await render(TAGS, { ...NONE, tagPath: "dev" });

    await act(async () => typeName("Dev renomeado"));
    const openItems = [...document.querySelectorAll("a")].find((a) =>
      a.textContent?.includes("Abrir itens"),
    ) as HTMLAnchorElement;
    await act(async () => openItems.click());

    expect(pushMock).not.toHaveBeenCalled();
    const alert = document.querySelector('[role="alertdialog"]');
    expect(alert?.textContent).toContain("Descartar alterações?");

    const discard = [...(alert?.querySelectorAll("button") ?? [])].find(
      (button) => button.textContent === "Descartar",
    );
    await act(async () => discard?.click());

    expect(pushMock).toHaveBeenCalledWith("/t/dev");
  });
});
