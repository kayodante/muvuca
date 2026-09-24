import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FlatTag } from "@/lib/tags/tree";

const { moveTagsMock, deleteTagsMock, toastSuccessMock } = vi.hoisted(() => ({
  moveTagsMock: vi.fn(),
  deleteTagsMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock("@/lib/actions/tags", () => ({
  moveTags: moveTagsMock,
  deleteTags: deleteTagsMock,
}));
vi.mock("sonner", () => ({ toast: { success: toastSuccessMock } }));

import { TagBulkPanel } from "./TagBulkPanel";

const TAGS: FlatTag[] = [
  {
    id: "a",
    parentId: null,
    path: "a",
    name: "Alfa",
    colorToken: "lime",
    description: null,
  },
  {
    id: "b",
    parentId: "a",
    path: "a/b",
    name: "Beta",
    colorToken: "lime",
    description: null,
  },
  {
    id: "c",
    parentId: null,
    path: "c",
    name: "Gama",
    colorToken: "lime",
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

const button = (label: string) =>
  [...document.querySelectorAll("button")].find(
    (node) => node.textContent === label,
  ) as HTMLButtonElement | undefined;

describe("TagBulkPanel", () => {
  it("disables the actions with nothing selected", async () => {
    await act(async () =>
      root?.render(
        <TagBulkPanel
          selectedIds={[]}
          flatTags={TAGS}
          onDone={vi.fn()}
          onCancel={vi.fn()}
        />,
      ),
    );

    expect(document.body.textContent).toContain(
      "Marque as tags que quer mover ou excluir.",
    );
    expect(button("Mover para…")?.disabled).toBe(true);
    expect(button("Excluir")?.disabled).toBe(true);
  });

  it("deletes every selected tag, then reports done", async () => {
    deleteTagsMock.mockResolvedValue({ ok: true, data: null });
    const onDone = vi.fn();
    await act(async () =>
      root?.render(
        <TagBulkPanel
          selectedIds={["a", "b"]}
          flatTags={TAGS}
          onDone={onDone}
          onCancel={vi.fn()}
        />,
      ),
    );

    expect(document.body.textContent).toContain("2 tags selecionadas");
    await act(async () => button("Excluir")?.click());

    const alert = document.querySelector('[role="alertdialog"]');
    expect(alert?.textContent).toContain("Excluir 2 tags?");
    expect(alert?.textContent).toContain("Alfa");
    expect(alert?.textContent).toContain("Beta");

    await act(async () => alert?.querySelector("form")?.requestSubmit());

    const sent = deleteTagsMock.mock.calls[0]?.[1] as FormData;
    expect(sent.getAll("ids")).toEqual(["a", "b"]);
    expect(toastSuccessMock).toHaveBeenCalledWith("2 tags excluídas.");
    expect(onDone).toHaveBeenCalled();
  });

  it("the move dialog says a child rides along and waits for a destination", async () => {
    await act(async () =>
      root?.render(
        <TagBulkPanel
          selectedIds={["a", "b"]}
          flatTags={TAGS}
          onDone={vi.fn()}
          onCancel={vi.fn()}
        />,
      ),
    );

    await act(async () => button("Mover para…")?.click());

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain("Mover 2 tags");
    expect(dialog?.textContent).toContain("1 tag já vai junto com a tag mãe.");
    expect(button("Mover")?.disabled).toBe(true);
    expect(
      [...(dialog?.querySelectorAll('input[name="ids"]') ?? [])].map(
        (input) => (input as HTMLInputElement).value,
      ),
    ).toEqual(["a"]);
  });
});
