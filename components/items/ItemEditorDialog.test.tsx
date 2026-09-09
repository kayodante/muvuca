import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ItemEditorDialog, type EditorTarget } from "./ItemEditorDialog";
import type { LibraryItem } from "@/lib/database/queries/items";
import type { Tag } from "@/lib/database/queries/tags";

const { toast, listTagsForSelectMock } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
  listTagsForSelectMock: vi.fn(),
}));

vi.mock("sonner", () => ({ toast }));

vi.mock("@/lib/actions/items", () => ({
  createItem: vi.fn(),
  updateItem: vi.fn(),
}));

vi.mock("@/lib/actions/tags", () => ({
  listTagsForSelect: listTagsForSelectMock,
}));

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

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  listTagsForSelectMock.mockResolvedValue({ ok: true, data: mockTags });
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.clearAllMocks();
});

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

async function renderEditor(target: EditorTarget, onOpenChange = vi.fn()) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(
      <ItemEditorDialog target={target} onOpenChange={onOpenChange} />,
    );
  });

  return container;
}

function tagTrigger() {
  return document.body.querySelector(
    'button[aria-haspopup="listbox"]',
  ) as HTMLButtonElement;
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
    expect(tagTrigger()).not.toBeNull();
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

  describe("carregamento sob demanda da árvore de tags", () => {
    it("desabilita o campo e informa que as tags estão carregando enquanto a action está pendente", async () => {
      let resolveTags!: (result: { ok: true; data: Tag[] }) => void;
      listTagsForSelectMock.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveTags = resolve;
        }),
      );

      container = document.createElement("div");
      document.body.append(container);
      root = createRoot(container);

      await act(async () => {
        root?.render(
          <ItemEditorDialog
            target={{ mode: "create" }}
            onOpenChange={vi.fn()}
          />,
        );
      });

      expect(tagTrigger()?.disabled).toBe(true);
      expect(document.body.textContent).toContain("Carregando tags...");

      await act(async () => {
        resolveTags({ ok: true, data: mockTags });
      });

      expect(tagTrigger()?.disabled).toBe(false);
      expect(document.body.textContent).toContain(
        "Selecione uma ou mais tags para organizar o item.",
      );
    });

    it("renderiza as tags carregadas pela action no sucesso, habilitando o combobox", async () => {
      await renderEditor({ mode: "create" });

      expect(listTagsForSelectMock).toHaveBeenCalledTimes(1);
      expect(tagTrigger()?.disabled).toBe(false);

      await act(async () => {
        tagTrigger().click();
      });

      const listbox = document.body.querySelector('[role="listbox"]');
      expect(listbox?.textContent).toContain("Tech");
      expect(document.body.textContent).toContain(
        "Selecione uma ou mais tags para organizar o item.",
      );
    });

    it("exibe alerta com botão de recarga quando a action falha, e refaz a chamada ao clicar", async () => {
      listTagsForSelectMock.mockResolvedValueOnce({
        ok: false,
        code: "UNKNOWN",
        message: "Não foi possível carregar as tags.",
      });

      await renderEditor({ mode: "create" });

      const alert = document.body.querySelector("#item-tags-load-error");
      expect(alert).not.toBeNull();
      expect(alert?.getAttribute("role")).toBe("alert");
      expect(alert?.textContent).toBe("Não foi possível carregar as tags.");
      expect(tagTrigger()?.disabled).toBe(true);
      expect(tagTrigger()?.getAttribute("aria-describedby")).toBe(
        "item-tags-load-error",
      );

      const retryButton = Array.from(
        document.body.querySelectorAll("button"),
      ).find((button) => button.textContent === "Tentar novamente");
      expect(retryButton).not.toBeUndefined();

      await act(async () => {
        (retryButton as HTMLButtonElement).click();
      });

      expect(listTagsForSelectMock).toHaveBeenCalledTimes(2);
      expect(document.body.querySelector("#item-tags-load-error")).toBeNull();
      expect(tagTrigger()?.disabled).toBe(false);
      expect(document.body.textContent).toContain(
        "Selecione uma ou mais tags para organizar o item.",
      );
    });

    it("renderiza campo de tags desabilitado com o texto de vazio quando a lista volta vazia", async () => {
      listTagsForSelectMock.mockResolvedValueOnce({ ok: true, data: [] });

      await renderEditor({ mode: "create" });

      expect(tagTrigger()?.disabled).toBe(true);
      expect(document.body.textContent).toContain(
        "Nenhuma tag cadastrada ainda",
      );
      expect(document.body.textContent).toContain(
        "Crie tags na seção Tags para organizar seus itens.",
      );
    });
  });
});
