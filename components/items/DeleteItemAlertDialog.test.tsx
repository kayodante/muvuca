import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeleteItemAlertDialog } from "./DeleteItemAlertDialog";
import type { LibraryItemSummary } from "@/lib/database/queries/items";

const { toast } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("sonner", () => ({ toast }));

vi.mock("@/lib/actions/items", () => ({
  deleteItem: vi.fn(),
}));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.clearAllMocks();
});

const mockItem: LibraryItemSummary = {
  id: "item-delete-1",
  type: "link",
  title: "Item to delete",
  description: "Description",
  url: "https://example.com",
  tagIds: [],
  preview: null,
};

async function renderDialog(
  item: LibraryItemSummary | null,
  onOpenChange = vi.fn(),
) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(
      <DeleteItemAlertDialog item={item} onOpenChange={onOpenChange} />,
    );
  });

  return container;
}

describe("DeleteItemAlertDialog", () => {
  it("não renderiza quando item é null", async () => {
    await renderDialog(null);
    expect(document.body.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it("renderiza o diálogo com o título do item", async () => {
    await renderDialog(mockItem);
    expect(document.body.textContent).toContain("Excluir “Item to delete”?");
    expect(document.body.textContent).toContain(
      "Esta ação remove o item e suas associações com tags.",
    );
  });
});
