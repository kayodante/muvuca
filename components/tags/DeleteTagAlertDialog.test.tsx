import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { deleteTagMock, toastSuccessMock } = vi.hoisted(() => ({
  deleteTagMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock("@/lib/actions/tags", () => ({ deleteTag: deleteTagMock }));
vi.mock("sonner", () => ({ toast: { success: toastSuccessMock } }));

import { DeleteTagAlertDialog } from "./DeleteTagAlertDialog";

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

describe("DeleteTagAlertDialog", () => {
  it("a leaf tag with no items: no children sentence, and says nothing uses the tag", async () => {
    await act(async () =>
      root?.render(
        <DeleteTagAlertDialog
          open
          onOpenChange={vi.fn()}
          tag={{
            id: "a",
            name: "Figma",
            itemCount: 0,
            childCount: 0,
            parentName: "Design",
          }}
        />,
      ),
    );

    const text = document.querySelector('[role="alertdialog"]')?.textContent;
    expect(text).toContain("Nenhum item usa esta tag.");
    expect(text).not.toContain("tags filhas");
    expect(text).not.toContain("tag filha");
  });

  it("a root tag with children: children become roots, singular for 1 child", async () => {
    await act(async () =>
      root?.render(
        <DeleteTagAlertDialog
          open
          onOpenChange={vi.fn()}
          tag={{
            id: "a",
            name: "Skills",
            itemCount: 0,
            childCount: 1,
            parentName: null,
          }}
        />,
      ),
    );

    const text = document.querySelector('[role="alertdialog"]')?.textContent;
    expect(text).toContain("A tag filha passa a ser raiz.");
    expect(text).not.toContain("passa para");
  });

  it("a tag with a parent, several children and several items: both sentences, plural", async () => {
    await act(async () =>
      root?.render(
        <DeleteTagAlertDialog
          open
          onOpenChange={vi.fn()}
          tag={{
            id: "a",
            name: "Design",
            itemCount: 3,
            childCount: 2,
            parentName: "Skills",
          }}
        />,
      ),
    );

    const text = document.querySelector('[role="alertdialog"]')?.textContent;
    expect(text).toContain("As 2 tags filhas passam para “Skills”.");
    expect(text).toContain(
      "3 itens perdem esta tag. Os itens não são excluídos.",
    );
  });

  it("exactly 1 item: singular sentence", async () => {
    await act(async () =>
      root?.render(
        <DeleteTagAlertDialog
          open
          onOpenChange={vi.fn()}
          tag={{
            id: "a",
            name: "Design",
            itemCount: 1,
            childCount: 0,
            parentName: "Skills",
          }}
        />,
      ),
    );

    const text = document.querySelector('[role="alertdialog"]')?.textContent;
    expect(text).toContain("1 item perde esta tag. O item não é excluído.");
  });
});
