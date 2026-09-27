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
    expect(row(dom, "react")?.getAttribute("aria-current")).toBe("true");
    expect(row(dom, "dev")?.hasAttribute("aria-current")).toBe(false);
  });

  it("uses bg-selected for the selected row and bg-hover for the open path, with the path's count/chevron in text-foreground", async () => {
    const dom = await renderColumns({ browseId: "react", selectedId: "react" });

    // "dev" is an ancestor of the browsed "react": open path, not selected.
    const dev = row(dom, "dev")!;
    expect(dev.className).toContain("bg-hover");
    expect(dev.className).not.toContain("bg-selected");
    // `.flex` picks the count/chevron wrapper, not the leading TagDot swatch
    // (also `aria-hidden`, but a plain circle with no `flex`).
    const devMeta = dev.querySelector("span[aria-hidden='true'].flex");
    expect(devMeta?.className).toContain("text-foreground");
    expect(devMeta?.className).not.toContain("text-muted-foreground");

    // "react" is the selected leaf itself.
    const react = row(dom, "react")!;
    expect(react.className).toContain("bg-selected");

    // "notas" is neither: plain hover state only.
    const notas = row(dom, "notas")!;
    expect(notas.className).toContain("hover:bg-hover");
    expect(notas.className).not.toContain("bg-selected");
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
    expect(dev.hasAttribute("aria-current")).toBe(false);

    await act(async () => dev.click());
    expect(onBrowse).toHaveBeenCalledWith("dev");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("a row's truncating name carries a title, in both normal and selection mode", async () => {
    const dom = await renderColumns();
    expect(
      row(dom, "dev")?.querySelector("span[title]")?.getAttribute("title"),
    ).toBe("Dev");

    const withChecked = await renderColumns({ checked: new Set() });
    const label = withChecked.querySelector("label span[title]");
    expect(label?.getAttribute("title")).toBe("Dev");
  });

  it("compact header shows the ancestor trail above/below a nested tag's name", async () => {
    // "frontend" needs a child of its own ("hooks") to become a column
    // *owner* two levels deep -- otherwise (as with "react", a leaf) the
    // compact column shown is its parent's, not its own.
    const deep: FlatTag[] = [...TAGS, tag("hooks", "react", "Hooks")];
    const dom = await renderColumns({
      compact: true,
      browseId: "react",
      flatTags: deep,
    });
    const header = dom.querySelector(".sticky")!;
    expect(header.textContent).toContain("Dev / Frontend");
    const trail = header.querySelector("[title]");
    expect(trail?.getAttribute("title")).toBe("Dev / Frontend");
  });

  it("compact header has no ancestor trail for a root tag", async () => {
    const dom = await renderColumns({ compact: true, browseId: "dev" });
    const header = dom.querySelector(".sticky")!;
    expect(header.querySelector("[title]")).toBeNull();
  });

  it("roving tabindex: one tabbable row per column, on the open path by default", async () => {
    const dom = await renderColumns({ browseId: "react", selectedId: "react" });
    // Roots column: "dev" is on the open path, "notas" is not.
    expect(row(dom, "dev")?.getAttribute("tabindex")).toBe("0");
    expect(row(dom, "notas")?.getAttribute("tabindex")).toBe("-1");
    // Deepest column: "react" is selected.
    expect(row(dom, "react")?.getAttribute("tabindex")).toBe("0");
  });

  it("roving tabindex remembers the row last focused in each column", async () => {
    const dom = await renderColumns();
    await act(async () => row(dom, "notas")?.focus());
    expect(row(dom, "notas")?.getAttribute("tabindex")).toBe("0");
    expect(row(dom, "dev")?.getAttribute("tabindex")).toBe("-1");
  });

  it("Down/Up move focus within a column without wrapping; Home/End jump to the ends", async () => {
    const dom = await renderColumns();
    const dev = row(dom, "dev")!;
    const notas = row(dom, "notas")!;
    await act(async () => dev.focus());

    await act(async () => {
      dev.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
    });
    expect(document.activeElement).toBe(notas);

    await act(async () => {
      notas.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
    });
    expect(document.activeElement).toBe(notas); // no wrap past the last row

    await act(async () => {
      notas.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Home", bubbles: true }),
      );
    });
    expect(document.activeElement).toBe(dev);

    await act(async () => {
      dev.dispatchEvent(
        new KeyboardEvent("keydown", { key: "End", bubbles: true }),
      );
    });
    expect(document.activeElement).toBe(notas);
  });

  it("Right on a row with children opens the next column and focuses its first row", async () => {
    const dom = await renderColumns();
    const dev = row(dom, "dev")!;
    await act(async () => dev.focus());

    await act(async () => {
      dev.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
    });
    expect(onBrowse).toHaveBeenCalledWith("dev");
    expect(onSelect).not.toHaveBeenCalled();

    // The parent applies the new browseId, as TagsPage does.
    await act(async () => {
      root?.render(
        <TagColumns
          flatTags={TAGS}
          browseId="dev"
          onBrowse={onBrowse}
          compact={false}
          selectedId={null}
          onSelect={onSelect}
        />,
      );
    });
    expect(document.activeElement).toBe(row(dom, "frontend"));
  });

  it("Right on a leaf row does nothing", async () => {
    const dom = await renderColumns();
    const notas = row(dom, "notas")!;
    await act(async () => notas.focus());
    await act(async () => {
      notas.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
    });
    expect(onBrowse).not.toHaveBeenCalled();
  });

  it("Left focuses this column's owner in the column to the left, without closing columns", async () => {
    const dom = await renderColumns({ browseId: "react" });
    const react = row(dom, "react")!;
    await act(async () => react.focus());
    await act(async () => {
      react.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
      );
    });
    expect(document.activeElement).toBe(row(dom, "frontend"));
    expect(onBrowse).not.toHaveBeenCalled();
  });

  it("Left on the roots column does nothing", async () => {
    const dom = await renderColumns();
    const dev = row(dom, "dev")!;
    await act(async () => dev.focus());
    await act(async () => {
      dev.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
      );
    });
    expect(document.activeElement).toBe(dev);
    expect(onBrowse).not.toHaveBeenCalled();
  });

  it("typeahead focuses the next row whose name starts with the typed letter, ignoring accents", async () => {
    const accented: FlatTag[] = [
      tag("dev", null, "Dev"),
      tag("icone", null, "Ícone"),
      tag("notas", null, "Notas"),
    ];
    const dom = await renderColumns({ flatTags: accented });
    const dev = row(dom, "dev")!;
    await act(async () => dev.focus());
    await act(async () => {
      dev.dispatchEvent(
        new KeyboardEvent("keydown", { key: "i", bubbles: true }),
      );
    });
    expect(document.activeElement).toBe(row(dom, "icone"));
  });
});

describe("TagSearchResults keyboard", () => {
  it("moves focus between results and hands off to the filter above the first", async () => {
    const onFocusFilter = vi.fn();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <TagSearchResults
          flatTags={TAGS}
          query="r"
          onClear={vi.fn()}
          onFocusFilter={onFocusFilter}
          selectedId={null}
          onSelect={onSelect}
        />,
      );
    });

    const frontend = row(container, "frontend")!;
    const react = row(container, "react")!;
    await act(async () => frontend.focus());

    await act(async () => {
      frontend.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
    });
    expect(document.activeElement).toBe(react);

    await act(async () => {
      react.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }),
      );
    });
    expect(document.activeElement).toBe(frontend);

    await act(async () => {
      frontend.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }),
      );
    });
    expect(onFocusFilter).toHaveBeenCalled();
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
          onFocusFilter={vi.fn()}
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
          onFocusFilter={vi.fn()}
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
