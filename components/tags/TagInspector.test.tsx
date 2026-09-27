import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FlatTag } from "@/lib/tags/tree";

vi.mock("@/lib/actions/tags", () => ({
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
}));
vi.mock("@/lib/actions/export", () => ({ exportTagLibrary: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { TagInspector, type InspectorTarget } from "./TagInspector";

// skills (root, no items) -> design (root, no items) -> figma (1 item)
//                                                     -> personal (0 items)
// dev (root, 3 items, no children)
const TAGS: FlatTag[] = [
  {
    id: "skills",
    parentId: null,
    path: "skills",
    name: "Skills",
    colorToken: "lime",
    description: null,
  },
  {
    id: "design",
    parentId: "skills",
    path: "skills/design",
    name: "Design",
    colorToken: "lime",
    description: null,
  },
  {
    id: "figma",
    parentId: "design",
    path: "skills/design/figma",
    name: "Figma",
    colorToken: "lime",
    description: null,
  },
  {
    id: "personal",
    parentId: "design",
    path: "skills/design/personal",
    name: "Pessoal",
    colorToken: "lime",
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

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

async function render(
  target: InspectorTarget,
  itemCounts: Record<string, number>,
  flatTags: FlatTag[] = TAGS,
) {
  await act(async () =>
    root?.render(
      <TagInspector
        target={target}
        flatTags={flatTags}
        itemCounts={itemCounts}
        headingRef={{ current: null }}
        onSelect={vi.fn()}
        onSaved={vi.fn()}
        onDeleted={vi.fn()}
        onDirtyChange={vi.fn()}
        onEscape={vi.fn()}
        onNavigate={vi.fn()}
      />,
    ),
  );
}

const sectionByHeading = (label: string) =>
  [...document.querySelectorAll("h3")]
    .find((h3) => h3.textContent?.startsWith(label))
    ?.closest("section");

describe("TagInspector -- nothing selected (curation panel)", () => {
  it("puts a childless parent whose child has an item in neither Vazias nor Com 1 item", async () => {
    // dev: 3 direct items, no children -> not empty, not single.
    // figma: 1 item -> single; its ancestors design/skills total 1 too.
    await render({ kind: "none" }, { figma: 1, dev: 3, personal: 0 });

    const empty = sectionByHeading("Vazias");
    const single = sectionByHeading("Com 1 item");

    expect(empty?.textContent).toContain("Pessoal");
    expect(empty?.textContent).not.toContain("Dev");
    expect(empty?.textContent).not.toContain("Design");

    expect(single?.textContent).toContain("Figma");
    expect(single?.textContent).toContain("Design");
    expect(single?.textContent).toContain("Skills");
    expect(single?.textContent).not.toContain("Dev");
  });

  it("groups repeated names with an accessible name of tag + location", async () => {
    // Independent, single-level fixture: "location" for a chip is its
    // immediate ancestor path, so a duplicate nested two levels deep (as
    // "figma" is in TAGS, under design under skills) would show a
    // multi-segment location instead of the single name this test checks.
    const withDuplicate: FlatTag[] = [
      {
        id: "design",
        parentId: null,
        path: "design",
        name: "Design",
        colorToken: "lime",
        description: null,
      },
      {
        id: "figma-a",
        parentId: "design",
        path: "design/figma",
        name: "Figma",
        colorToken: "lime",
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
      {
        id: "figma-b",
        parentId: "dev",
        path: "dev/figma",
        name: "Figma",
        colorToken: "lime",
        description: null,
      },
    ];
    await render({ kind: "none" }, {}, withDuplicate);

    const group = sectionByHeading("Nomes repetidos");
    expect(group?.textContent).toContain("Figma");
    expect(group?.textContent).toContain("×2");

    const chips = [...(group?.querySelectorAll("button") ?? [])];
    const underDesign = chips.find((b) => b.textContent === "Design");
    const underDev = chips.find((b) => b.textContent === "Dev");

    expect(underDesign?.getAttribute("aria-label")).toBe("Figma — Design");
    expect(underDev?.getAttribute("aria-label")).toBe("Figma — Dev");
  });

  it("shows 'Raiz' as the location for a root-level duplicate", async () => {
    const rootDuplicate: FlatTag[] = [
      ...TAGS,
      {
        id: "dev-2",
        parentId: null,
        path: "dev-2",
        name: "Dev",
        colorToken: "blue",
        description: null,
      },
    ];
    await render({ kind: "none" }, {}, rootDuplicate);

    const group = sectionByHeading("Nomes repetidos");
    const chips = [...(group?.querySelectorAll("button") ?? [])];
    const rootChip = chips.find((b) => b.textContent === "Raiz");

    expect(rootChip?.getAttribute("aria-label")).toBe("Dev — Raiz");
  });

  it("says everything is tidy once nothing is empty, single or repeated", async () => {
    await render({ kind: "none" }, { figma: 2, personal: 2, dev: 3 });

    expect(document.body.textContent).toContain(
      "Nenhuma tag vazia, nenhuma com só 1 item e nenhum nome se repete.",
    );
  });
});

describe("TagInspector -- a tag selected", () => {
  it("shows the direct item count under the path, not the subtree total", async () => {
    await render({ kind: "edit", id: "design" }, { design: 0, figma: 5 });

    expect(document.body.textContent).toContain("Nenhum item com esta tag");
  });

  it("uses the singular for exactly 1 direct item", async () => {
    await render({ kind: "edit", id: "dev" }, { dev: 1 });

    expect(document.body.textContent).toContain("1 item com esta tag");
  });

  it("uses the plural for more than 1 direct item", async () => {
    await render({ kind: "edit", id: "dev" }, { dev: 4 });

    expect(document.body.textContent).toContain("4 itens com esta tag");
  });
});
