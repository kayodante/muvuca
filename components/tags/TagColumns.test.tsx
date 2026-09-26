import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FlatTag } from "@/lib/tags/tree";
import { TagColumns, TagSearchResults } from "./TagColumns";

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const onSelect = vi.fn();
const onBrowse = vi.fn();

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.clearAllMocks();
});

function tag(id: string, parentId: string | null, name: string): FlatTag {
  return {
    id,
    parentId,
    name,
    colorToken: "lime",
    description: null,
    path: id,
  };
}

// Dev -> Frontend -> React; Notas
const TAGS: FlatTag[] = [
  tag("dev", null, "Dev"),
  tag("frontend", "dev", "Frontend"),
  tag("react", "frontend", "React"),
  tag("notas", null, "Notas"),
];

async function renderColumns(
  props: Partial<ComponentProps<typeof TagColumns>> = {},
) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <TagColumns
        flatTags={TAGS}
        browseId={null}
        onBrowse={onBrowse}
        compact={false}
        selectedId={null}
        onSelect={onSelect}
        {...props}
      />,
    );
  });
  return container;
}

const groups = (dom: ParentNode) =>
  [...dom.querySelectorAll('[role="group"]')].map((group) =>
    group.getAttribute("aria-label"),
  );
const row = (dom: ParentNode, id: string) =>
  dom.querySelector(`[data-tag-row="${id}"]`) as HTMLButtonElement | null;

describe("TagColumns", () => {
  it("starts with the roots and opens one column per level down the path", async () => {
    const dom = await renderColumns();
    expect(groups(dom)).toEqual(["Raízes"]);
    expect(row(dom, "frontend")).toBeNull();

    await act(async () => {
      root?.render(
        <TagColumns
          flatTags={TAGS}
          browseId="react"
          onBrowse={onBrowse}
          compact={false}
          selectedId="react"
          onSelect={onSelect}
        />,
      );
    });
    expect(groups(dom)).toEqual(["Raízes", "Dev", "Frontend"]);
    expect(row(dom, "react")?.getAttribute("aria-pressed")).toBe("true");
    expect(row(dom, "dev")?.getAttribute("aria-pressed")).toBe("false");
  });

  it("names a row by the tag alone and describes how many children it has", async () => {
    const dom = await renderColumns();
    const dev = row(dom, "dev")!;
    // `textContent` would include the visible count; the accessible name
    // must not, so the description lives in a referenced hidden node.
    const description = document.getElementById(
      dev.getAttribute("aria-describedby") ?? "",
    );
    expect(description?.textContent).toBe("1 tag filha");
    expect(row(dom, "notas")?.hasAttribute("aria-describedby")).toBe(false);

    await act(async () => dev.click());
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "dev" }),
    );
    expect(onBrowse).not.toHaveBeenCalled();
  });

  it("in selection mode rows are checkboxes and a separate button opens the branch", async () => {
    const onToggleChecked = vi.fn();
    const dom = await renderColumns({
      checked: new Set(["notas"]),
      onToggleChecked,
    });

    const boxes = dom.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    expect([...boxes].map((box) => box.closest("label")?.textContent)).toEqual([
      "Dev",
      "Notas",
    ]);
    expect(boxes[1]?.checked).toBe(true);
    expect(dom.querySelector("[data-tag-row]")).toBeNull();

    await act(async () => boxes[0]?.click());
    expect(onToggleChecked).toHaveBeenCalledWith(
      expect.objectContaining({ id: "dev" }),
    );

    const open = dom.querySelector(
      'button[aria-label="Abrir Dev"]',
    ) as HTMLButtonElement;
    await act(async () => open.click());
    expect(onBrowse).toHaveBeenCalledWith("dev");
  });

  it("compact keeps only the deepest column; a branch drills, the header goes back or edits", async () => {
    const dom = await renderColumns({ compact: true, browseId: "frontend" });
    expect(groups(dom)).toEqual(["Frontend"]);

    await act(async () => row(dom, "react")?.click());
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "react" }),
    );

    await act(async () =>
      (
        dom.querySelector(
          'button[aria-label="Voltar para Dev"]',
        ) as HTMLButtonElement
      ).click(),
    );
    expect(onBrowse).toHaveBeenCalledWith("dev");

    await act(async () =>
      (
        dom.querySelector(
          'button[aria-label="Editar Frontend"]',
        ) as HTMLButtonElement
      ).click(),
    );
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "frontend" }),
    );
  });

  it("compact rows with children browse instead of selecting", async () => {
    const dom = await renderColumns({ compact: true });
    const dev = row(dom, "dev")!;
    expect(dev.hasAttribute("aria-pressed")).toBe(false);

    await act(async () => dev.click());
    expect(onBrowse).toHaveBeenCalledWith("dev");
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("TagSearchResults", () => {
  it("lists every match flat, described by where it lives", async () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <TagSearchResults
          flatTags={TAGS}
          query="r"
          onClear={vi.fn()}
          selectedId={null}
          onSelect={onSelect}
        />,
      );
    });

    const react = row(container, "react")!;
    expect(row(container, "frontend")).not.toBeNull();
    expect(row(container, "dev")).toBeNull();
    expect(
      document.getElementById(react.getAttribute("aria-describedby") ?? "")
        ?.textContent,
    ).toBe("Dev / Frontend");

    await act(async () => react.click());
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "react" }),
    );
  });

  it("offers to clear a query with no match", async () => {
    const onClear = vi.fn();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <TagSearchResults
          flatTags={TAGS}
          query="zzz"
          onClear={onClear}
          selectedId={null}
          onSelect={onSelect}
        />,
      );
    });

    expect(container.textContent).toContain("Nenhuma tag encontrada");
    const clear = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Limpar busca",
    );
    await act(async () => clear?.click());
    expect(onClear).toHaveBeenCalled();
  });
});
