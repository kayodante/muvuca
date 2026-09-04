import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ItemEditorDialog, type EditorTarget } from "./ItemEditorDialog";
import type { LibraryItem } from "@/lib/database/queries/items";
import type { Tag } from "@/lib/database/queries/tags";

const { toast } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("sonner", () => ({ toast }));

vi.mock("@/lib/actions/items", () => ({
  createItem: vi.fn(),
  updateItem: vi.fn(),
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

const mockTags: Tag[] = [
  {
    id: "tag-1",
    name: "Tech",
    colorToken: "blue",
    description: null,
    parentId: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
];

const mockEditLinkItem: LibraryItem = {
  id: "item-edit-1",
  type: "link",
  title: "Existing Link Title",
  description: "Existing Description",
  url: "https://example.com/docs",
  content: null,
  tagIds: ["tag-1"],
};

const mockEditCodeComponentItemWithUrl: LibraryItem = {
  id: "item-edit-2",
  type: "code_component",
  title: "Button Component",
  description: "A reusable button",
  url: "https://example.com/button",
  content: "export function Button() { return <button />; }",
  tagIds: ["tag-1"],
};

const mockEditCodeComponentItemWithoutUrl: LibraryItem = {
  id: "item-edit-3",
  type: "code_component",
  title: "Card Component",
  description: null,
  url: null,
  content: "export function Card() { return <div />; }",
  tagIds: [],
};

const mockEditPromptItem: LibraryItem = {
  id: "item-edit-4",
  type: "prompt",
  title: "Refactor Prompt",
  description: null,
  url: null,
  content: "Please refactor this code...",
  tagIds: [],
};

async function renderEditor(
  target: EditorTarget,
  tags = mockTags,
  onOpenChange = vi.fn(),
) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(
      <ItemEditorDialog
        target={target}
        tags={tags}
        onOpenChange={onOpenChange}
      />,
    );
  });

  return container;
}

describe("ItemEditorDialog", () => {
  it("renderiza em modo de criação com opções de tipo link, prompt e code_component", async () => {
    await renderEditor({ mode: "create" });
    expect(document.body.textContent).toContain("Novo item");
    expect(document.body.textContent).toContain(
      "Links, prompts e componentes ficam privados na sua biblioteca.",
    );

    // Radio buttons
    const linkRadio = document.body.querySelector(
      'input[type="radio"][value="link"]',
    ) as HTMLInputElement;
    const promptRadio = document.body.querySelector(
      'input[type="radio"][value="prompt"]',
    ) as HTMLInputElement;
    const codeRadio = document.body.querySelector(
      'input[type="radio"][value="code_component"]',
    ) as HTMLInputElement;

    expect(linkRadio).not.toBeNull();
    expect(promptRadio).not.toBeNull();
    expect(codeRadio).not.toBeNull();
    expect(linkRadio.checked).toBe(true);

    expect(document.body.textContent).toContain("Link");
    expect(document.body.textContent).toContain("Prompt");
    expect(document.body.textContent).toContain("Componente de código");

    expect(document.body.querySelector('input[name="title"]')).not.toBeNull();
    const urlInput = document.body.querySelector(
      'input[name="url"]',
    ) as HTMLInputElement;
    expect(urlInput).not.toBeNull();
    expect(urlInput.required).toBe(true);
    expect(
      document.body.querySelector('button[aria-haspopup="listbox"]'),
    ).not.toBeNull();
  });

  it("alterna para prompt e exibe textarea de conteúdo", async () => {
    await renderEditor({ mode: "create" });

    const promptRadio = document.body.querySelector(
      'input[type="radio"][value="prompt"]',
    ) as HTMLInputElement;

    await act(async () => {
      promptRadio.click();
    });

    const contentTextarea = document.body.querySelector(
      'textarea[name="content"]',
    ) as HTMLTextAreaElement;
    expect(contentTextarea).not.toBeNull();
    expect(contentTextarea.required).toBe(true);
    expect(document.body.querySelector('input[name="url"]')).toBeNull();
  });

  it("alterna para componente de código e exibe textarea de código e link de fonte opcional", async () => {
    await renderEditor({ mode: "create" });

    const codeRadio = document.body.querySelector(
      'input[type="radio"][value="code_component"]',
    ) as HTMLInputElement;

    await act(async () => {
      codeRadio.click();
    });

    expect(document.body.textContent).toContain("Código");
    expect(document.body.textContent).toContain("Link da fonte (opcional)");

    const contentTextarea = document.body.querySelector(
      'textarea[name="content"]',
    ) as HTMLTextAreaElement;
    expect(contentTextarea).not.toBeNull();
    expect(contentTextarea.required).toBe(true);
    expect(contentTextarea.placeholder).toBe(
      "Cole o código do componente aqui...",
    );
    expect(contentTextarea.className).toContain("font-mono");

    const urlInput = document.body.querySelector(
      'input[name="url"]',
    ) as HTMLInputElement;
    expect(urlInput).not.toBeNull();
    expect(urlInput.required).toBe(false);
    expect(urlInput.placeholder).toBe("https://exemplo.com/componente");
  });

  it("renderiza em modo de edição para link com valores pré-preenchidos e tags selecionadas", async () => {
    await renderEditor({ mode: "edit", item: mockEditLinkItem });
    expect(document.body.textContent).toContain("Editar item");
    const titleInput = document.body.querySelector(
      'input[name="title"]',
    ) as HTMLInputElement;
    expect(titleInput?.value).toBe("Existing Link Title");

    const urlInput = document.body.querySelector(
      'input[name="url"]',
    ) as HTMLInputElement;
    expect(urlInput?.value).toBe("https://example.com/docs");

    // Tag chip deve ser exibido
    expect(document.body.textContent).toContain("Tech");
    const hiddenTagInput = document.body.querySelector(
      'input[type="hidden"][name="tagIds"]',
    ) as HTMLInputElement;
    expect(hiddenTagInput?.value).toBe("tag-1");
  });

  it("renderiza em modo de edição para code_component com URL de fonte", async () => {
    await renderEditor({
      mode: "edit",
      item: mockEditCodeComponentItemWithUrl,
    });
    expect(document.body.textContent).toContain("Editar item");

    const codeRadio = document.body.querySelector(
      'input[type="radio"][value="code_component"]',
    ) as HTMLInputElement;
    expect(codeRadio.checked).toBe(true);

    const titleInput = document.body.querySelector(
      'input[name="title"]',
    ) as HTMLInputElement;
    expect(titleInput?.value).toBe("Button Component");

    const contentTextarea = document.body.querySelector(
      'textarea[name="content"]',
    ) as HTMLTextAreaElement;
    expect(contentTextarea?.value).toBe(
      "export function Button() { return <button />; }",
    );

    const urlInput = document.body.querySelector(
      'input[name="url"]',
    ) as HTMLInputElement;
    expect(urlInput?.value).toBe("https://example.com/button");

    const descTextarea = document.body.querySelector(
      'textarea[name="description"]',
    ) as HTMLTextAreaElement;
    expect(descTextarea?.value).toBe("A reusable button");

    expect(document.body.textContent).toContain("Tech");
  });

  it("renderiza em modo de edição para code_component sem URL de fonte", async () => {
    await renderEditor({
      mode: "edit",
      item: mockEditCodeComponentItemWithoutUrl,
    });
    expect(document.body.textContent).toContain("Editar item");

    const codeRadio = document.body.querySelector(
      'input[type="radio"][value="code_component"]',
    ) as HTMLInputElement;
    expect(codeRadio.checked).toBe(true);

    const titleInput = document.body.querySelector(
      'input[name="title"]',
    ) as HTMLInputElement;
    expect(titleInput?.value).toBe("Card Component");

    const contentTextarea = document.body.querySelector(
      'textarea[name="content"]',
    ) as HTMLTextAreaElement;
    expect(contentTextarea?.value).toBe(
      "export function Card() { return <div />; }",
    );

    const urlInput = document.body.querySelector(
      'input[name="url"]',
    ) as HTMLInputElement;
    expect(urlInput?.value).toBe("");
  });

  it("renderiza em modo de edição para prompt", async () => {
    await renderEditor({ mode: "edit", item: mockEditPromptItem });
    expect(document.body.textContent).toContain("Editar item");

    const promptRadio = document.body.querySelector(
      'input[type="radio"][value="prompt"]',
    ) as HTMLInputElement;
    expect(promptRadio.checked).toBe(true);

    const titleInput = document.body.querySelector(
      'input[name="title"]',
    ) as HTMLInputElement;
    expect(titleInput?.value).toBe("Refactor Prompt");

    const contentTextarea = document.body.querySelector(
      'textarea[name="content"]',
    ) as HTMLTextAreaElement;
    expect(contentTextarea?.value).toBe("Please refactor this code...");

    expect(document.body.querySelector('input[name="url"]')).toBeNull();
  });

  it("renderiza campo de tags desabilitado quando tags está vazio", async () => {
    await renderEditor({ mode: "create" }, []);
    const tagTrigger = document.body.querySelector(
      'button[aria-haspopup="listbox"]',
    ) as HTMLButtonElement;
    expect(tagTrigger?.disabled).toBe(true);
    expect(document.body.textContent).toContain("Nenhuma tag cadastrada ainda");
  });
});
