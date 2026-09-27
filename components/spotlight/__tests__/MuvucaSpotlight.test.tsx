import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MuvucaSpotlight } from "@/components/spotlight/MuvucaSpotlight";
import type { Tag } from "@/lib/database/queries/tags";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

// Mock next/navigation. `push` is hoisted (not a fresh `vi.fn()` per render)
// so tests can assert on the "Ver todos na biblioteca" / quick-action
// navigation calls.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
  }),
}));

const initialMockData = {
  items: [
    {
      id: "item-1",
      type: "link" as const,
      title: "Supabase Documentation",
      description: "Docs for Supabase Auth and Database",
      url: "https://supabase.com/docs",
      tagIds: ["tag-1"],
      preview: null,
    },
    {
      id: "item-2",
      type: "prompt" as const,
      title: "Prompt Code Reviewer",
      description: "System prompt for reviewing code",
      url: null,
      contentPreview: "Você é um revisor de código experiente...",
      tagIds: ["tag-2"],
    },
  ],
  tags: [
    {
      id: "tag-1",
      name: "Dev",
      description: null,
      colorToken: "lime",
      parentId: null,
      path: "tag-1",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
    {
      id: "tag-2",
      name: "Prompts",
      description: null,
      colorToken: "blue",
      parentId: null,
      path: "tag-2",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  ],
  hasMore: false,
};

const {
  getSpotlightInitialDataMock,
  searchSpotlightItemsMock,
  getItemDetailsMock,
  copyToClipboardMock,
  setThemeMock,
} = vi.hoisted(() => ({
  getSpotlightInitialDataMock: vi.fn(),
  searchSpotlightItemsMock: vi.fn(),
  getItemDetailsMock: vi.fn(),
  copyToClipboardMock: vi.fn().mockResolvedValue(true),
  setThemeMock: vi.fn(),
}));

vi.mock("@/lib/clipboard", () => ({
  copyToClipboard: copyToClipboardMock,
}));

vi.mock("@/lib/actions/items", () => ({
  getItemDetails: getItemDetailsMock,
}));

// Mock spotlight Server Actions
vi.mock("@/lib/actions/spotlight", () => ({
  getSpotlightInitialData: getSpotlightInitialDataMock,
  searchSpotlightItems: searchSpotlightItemsMock,
}));

vi.mock("@/lib/actions/theme", () => ({
  setTheme: setThemeMock,
}));

const mockTags: Tag[] = [
  {
    id: "tag-1",
    name: "Dev",
    description: null,
    colorToken: "lime",
    parentId: null,
    path: "tag-1",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    id: "tag-2",
    name: "Prompts",
    description: null,
    colorToken: "blue",
    parentId: null,
    path: "tag-2",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
];

describe("MuvucaSpotlight", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSpotlightInitialDataMock.mockResolvedValue({
      ok: true,
      data: initialMockData,
    });
    searchSpotlightItemsMock.mockResolvedValue({
      ok: true,
      data: {
        items: [],
        tags: [],
        hasMore: false,
      },
    });
    getItemDetailsMock.mockResolvedValue({
      ok: true,
      data: {
        id: "item-2",
        type: "prompt",
        title: "Prompt Code Reviewer",
        content:
          "Você é um revisor de código experiente com instruções completas...",
        url: null,
        description: "System prompt for reviewing code",
        tagIds: ["tag-2"],
      },
    });
    copyToClipboardMock.mockResolvedValue(true);
    setThemeMock.mockResolvedValue({ ok: true, data: "light" });
  });

  it("renderiza o input de busca, ações e atalhos quando aberto", () => {
    const handleOpenChange = vi.fn();
    const markup = renderToStaticMarkup(
      <MuvucaSpotlight
        open={true}
        onOpenChange={handleOpenChange}
        initialTags={mockTags}
      />,
    );

    expect(markup).toContain("Buscar itens ou ações…");
    expect(markup).toContain("Filtrar por tag:");
    expect(markup).toContain("Criar novo item");
    expect(markup).toContain("Ir para Biblioteca");
    expect(markup).toContain("navegar");
    expect(markup).toContain("selecionar");
    expect(markup).toContain("prévia");
    expect(markup).toContain("fechar");
    expect(markup).toContain("t-modal");
    expect(markup).not.toContain("is-open");
  });

  it("renderiza null quando fechado", () => {
    const handleOpenChange = vi.fn();
    const markup = renderToStaticMarkup(
      <MuvucaSpotlight open={false} onOpenChange={handleOpenChange} />,
    );

    expect(markup).toBe("");
  });

  it("liga o input ao listbox por aria-activedescendant e move o alvo com as setas", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MuvucaSpotlight
          open={true}
          onOpenChange={vi.fn()}
          initialTags={mockTags}
        />,
      );
    });

    const input = container.querySelector("input[type='text']");
    const listbox = container.querySelector("[role='listbox']");
    const options = [...container.querySelectorAll("[role='option']")];

    expect(input).not.toBeNull();
    expect(listbox).not.toBeNull();
    expect(options.length).toBeGreaterThan(1);

    // APG combobox: input controla listbox
    expect(input?.getAttribute("role")).toBe("combobox");
    expect(input?.getAttribute("aria-expanded")).toBe("true");
    expect(input?.getAttribute("aria-autocomplete")).toBe("list");
    expect(input?.getAttribute("aria-controls")).toBe(listbox?.id);

    // Primeiro item selecionado por padrão
    expect(input?.getAttribute("aria-activedescendant")).toBe(options[0]?.id);
    expect(options[0]?.getAttribute("aria-selected")).toBe("true");

    // ArrowDown navega para o segundo item
    await act(async () => {
      input?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
    });

    expect(input?.getAttribute("aria-activedescendant")).toBe(options[1]?.id);
    expect(options[1]?.getAttribute("aria-selected")).toBe("true");

    await act(async () => root.unmount());
    container.remove();
  });

  it("marca o diálogo modal com as propriedades de acessibilidade corretas", () => {
    const markup = renderToStaticMarkup(
      <MuvucaSpotlight open={true} onOpenChange={vi.fn()} />,
    );
    const dialogMatch = markup.match(/<div[^>]*role="dialog"[^>]*>/)?.[0] ?? "";

    expect(dialogMatch).toContain('aria-modal="true"');
    expect(dialogMatch).toContain("t-modal");
    expect(dialogMatch).toContain('aria-label="Busca rápida"');
    expect(dialogMatch).not.toContain("inset-0");
  });

  it("fecha o diálogo ao pressionar Escape", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const handleOpenChange = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MuvucaSpotlight open={true} onOpenChange={handleOpenChange} />,
      );
    });

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });

    expect(handleOpenChange).toHaveBeenCalledWith(false);

    await act(async () => root.unmount());
    container.remove();
  });

  it("ArrowRight com o caret no fim abre a prévia; ArrowLeft fecha", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MuvucaSpotlight
          open={true}
          onOpenChange={vi.fn()}
          initialTags={mockTags}
        />,
      );
    });

    // Aguarda carregar os itens iniciais mockados
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const input = container.querySelector(
      "input[type='text']",
    ) as HTMLInputElement;

    // Busca vazia: as 5 ações vêm antes dos "Recentes" -- desce até o
    // primeiro item para ter um `currentItem` real.
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        input.dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
        );
      }
    });

    // Caret no fim de um valor vazio: trivialmente 0 === 0 === length.
    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
    });

    const quickLookRegion = container.querySelector(
      '[aria-label="Pré-visualização do item"]',
    );
    expect(quickLookRegion).not.toBeNull();

    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
      );
    });

    expect(
      container.querySelector('[aria-label="Pré-visualização do item"]'),
    ).toBeNull();

    await act(async () => root.unmount());
    container.remove();
  });

  it("ArrowRight com o caret no meio do texto não abre a prévia", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<MuvucaSpotlight open={true} onOpenChange={vi.fn()} />);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const input = container.querySelector(
      "input[type='text']",
    ) as HTMLInputElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "abc");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    input.setSelectionRange(1, 1);

    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
    });

    expect(
      container.querySelector('[aria-label="Pré-visualização do item"]'),
    ).toBeNull();

    await act(async () => root.unmount());
    container.remove();
  });

  it("nenhuma [role='option'] tem button, a ou [tabindex] descendente", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MuvucaSpotlight
          open={true}
          onOpenChange={vi.fn()}
          initialTags={mockTags}
        />,
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const options = [...container.querySelectorAll("[role='option']")];
    expect(options.length).toBeGreaterThan(0);
    for (const option of options) {
      expect(option.querySelectorAll("button, a, [tabindex]").length).toBe(0);
    }

    await act(async () => root.unmount());
    container.remove();
  });

  it("nome acessível da opção é o título do item, não o snippet de código", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<MuvucaSpotlight open={true} onOpenChange={vi.fn()} />);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    searchSpotlightItemsMock.mockResolvedValueOnce({
      ok: true,
      data: {
        items: [
          {
            id: "item-long-code",
            type: "code_component",
            title: "Util de formatação",
            language: "typescript",
            contentPreview: "x".repeat(2000),
            tagIds: [],
          },
        ],
        tags: [],
        hasMore: false,
      },
    });

    const input = container.querySelector(
      "input[type='text']",
    ) as HTMLInputElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "util");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    const option = [...container.querySelectorAll("[role='option']")].find(
      (el) => el.textContent?.includes("Util de formatação"),
    );
    expect(option).toBeDefined();

    const titleId = option?.getAttribute("aria-labelledby");
    expect(titleId).toBeTruthy();
    const titleEl = document.getElementById(titleId!);
    expect(titleEl?.textContent).toBe("Util de formatação");

    await act(async () => root.unmount());
    container.remove();
  });

  it("restaura o foco para o elemento ativo anterior ao fechar", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const button = document.createElement("button");
    button.textContent = "Trigger";
    document.body.append(button);
    button.focus();
    expect(document.activeElement).toBe(button);

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<MuvucaSpotlight open={true} onOpenChange={vi.fn()} />);
    });

    const input = container.querySelector("input[type='text']");
    expect(input).not.toBeNull();

    // Fecha o modal
    await act(async () => {
      root.render(<MuvucaSpotlight open={false} onOpenChange={vi.fn()} />);
    });

    // Foco deve ser restaurado para o botão disparador
    expect(document.activeElement).toBe(button);

    await act(async () => root.unmount());
    container.remove();
    button.remove();
  });

  it("prende o foco com Tab e Shift+Tab dentro do diálogo modal", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MuvucaSpotlight
          open={true}
          onOpenChange={vi.fn()}
          initialTags={mockTags}
        />,
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const dialog = container.querySelector("[role='dialog']");
    expect(dialog).not.toBeNull();

    const focusable = dialog!.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    expect(focusable.length).toBeGreaterThan(1);

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    expect(first).toBeDefined();
    expect(last).toBeDefined();
    if (!first || !last) return;

    // Simula Tab quando o último elemento está focado -> deve voltar para o primeiro
    last.focus();
    expect(document.activeElement).toBe(last);

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Tab",
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    expect(document.activeElement).toBe(first);

    // Simula Shift+Tab quando o primeiro elemento está focado -> deve ir para o último
    first.focus();
    expect(document.activeElement).toBe(first);

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Tab",
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    expect(document.activeElement).toBe(last);

    await act(async () => root.unmount());
    container.remove();
  });

  it("descarta respostas de busca antigas que chegam fora de ordem", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.useFakeTimers();

    let resolveFirstQuery!: (value: unknown) => void;
    let resolveSecondQuery!: (value: unknown) => void;

    searchSpotlightItemsMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstQuery = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecondQuery = resolve;
          }),
      );

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<MuvucaSpotlight open={true} onOpenChange={vi.fn()} />);
    });

    const input = container.querySelector(
      "input[type='text']",
    ) as HTMLInputElement;

    // Dispara primeira busca ("a")
    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeInputValueSetter?.call(input, "a");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(searchSpotlightItemsMock).toHaveBeenCalledWith("a", null);

    // Dispara segunda busca ("ab")
    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeInputValueSetter?.call(input, "ab");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(searchSpotlightItemsMock).toHaveBeenCalledWith("ab", null);

    // Segunda busca resolve ANTES da primeira
    await act(async () => {
      resolveSecondQuery({
        ok: true,
        data: {
          items: [
            {
              id: "item-newer",
              type: "prompt",
              title: "Resultado Mais Recente (ab)",
              tagIds: [],
            },
          ],
          tags: [],
          hasMore: false,
        },
      });
    });

    // Primeira busca (lenta) resolve DEPOIS
    await act(async () => {
      resolveFirstQuery({
        ok: true,
        data: {
          items: [
            {
              id: "item-stale",
              type: "prompt",
              title: "Resultado Antigo Descartado (a)",
              tagIds: [],
            },
          ],
          tags: [],
          hasMore: false,
        },
      });
    });

    // Somente o resultado mais recente deve estar visível
    expect(container.textContent).toContain("Resultado Mais Recente (ab)");
    expect(container.textContent).not.toContain(
      "Resultado Antigo Descartado (a)",
    );

    vi.useRealTimers();
    await act(async () => root.unmount());
    container.remove();
  });

  it("preserva resultados do servidor mesmo quando o termo de busca não é substring literal", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.useFakeTimers();

    searchSpotlightItemsMock.mockResolvedValueOnce({
      ok: true,
      data: {
        items: [
          {
            id: "item-fts",
            type: "prompt",
            title: "Configuração do Ambiente", // "configurações" dá match por stemming no Postgres
            description: "Setup de dev",
            contentPreview: "Passo a passo",
            tagIds: [],
          },
        ],
        tags: [],
        hasMore: false,
      },
    });

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<MuvucaSpotlight open={true} onOpenChange={vi.fn()} />);
    });

    const input = container.querySelector(
      "input[type='text']",
    ) as HTMLInputElement;

    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeInputValueSetter?.call(input, "configurações");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    // O item retornado pela busca FTS do servidor deve ser exibido
    expect(container.textContent).toContain("Configuração do Ambiente");

    vi.useRealTimers();
    await act(async () => root.unmount());
    container.remove();
  });

  it("busca o conteúdo completo via getItemDetails ao copiar prompt", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MuvucaSpotlight
          open={true}
          onOpenChange={vi.fn()}
          initialTags={mockTags}
        />,
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const input = container.querySelector(
      "input[type='text']",
    ) as HTMLInputElement;
    expect(input).not.toBeNull();

    // Procura a opção do item de prompt pelo título (o botão de copiar virou
    // um span aria-hidden -- ver "no interactive descendants" no commit 2).
    const promptOption = [
      ...container.querySelectorAll("[role='option']"),
    ].find((el) => el.textContent?.includes("Prompt Code Reviewer"));
    expect(promptOption).toBeDefined();

    // Clica no pill de copiar (aria-hidden, pointer-only) dentro da opção
    const copySpan = [
      ...promptOption!.querySelectorAll('span[aria-hidden="true"]'),
    ].find((el) => el.textContent?.includes("Copiar"));
    expect(copySpan).toBeDefined();

    await act(async () => {
      (copySpan as HTMLElement).click();
    });

    expect(getItemDetailsMock).toHaveBeenCalledWith("item-2");
    expect(copyToClipboardMock).toHaveBeenCalled();

    await act(async () => root.unmount());
    container.remove();
  });

  it("mostra o item primeiro e as ações depois para uma busca digitada; Enter age no item, não em 'Criar novo item'", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<MuvucaSpotlight open={true} onOpenChange={vi.fn()} />);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    searchSpotlightItemsMock.mockResolvedValueOnce({
      ok: true,
      data: {
        items: [
          {
            id: "item-prompt-match",
            type: "prompt",
            title: "Prompt de Revisão",
            contentPreview: "conteúdo completo do prompt",
            tagIds: [],
          },
        ],
        tags: [],
        hasMore: false,
      },
    });

    const input = container.querySelector(
      "input[type='text']",
    ) as HTMLInputElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "prompt");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    const options = [...container.querySelectorAll("[role='option']")];
    expect(options[0]?.textContent).toContain("Prompt de Revisão");
    const createItemIndex = options.findIndex((el) =>
      el.textContent?.includes("Criar novo item"),
    );
    expect(createItemIndex).toBeGreaterThan(0);

    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    // Age no item (copia via getItemDetails), não na ação "Criar novo item".
    expect(getItemDetailsMock).toHaveBeenCalledWith("item-prompt-match");
    expect(pushMock).not.toHaveBeenCalledWith("/library?create=1");

    await act(async () => root.unmount());
    container.remove();
  });

  it("Enter durante busca pendente não age no item antigo; ao chegar o resultado fresco, age nele", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MuvucaSpotlight
          open={true}
          onOpenChange={vi.fn()}
          initialTags={mockTags}
        />,
      );
      // Espera o carregamento inicial ("Recentes") resolver com timer real.
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // `finally` garante que os fake timers voltem ao normal mesmo se uma
    // asserção falhar aqui -- do contrário todo teste seguinte no arquivo
    // trava esperando um setTimeout real que nunca dispara.
    vi.useFakeTimers();
    try {
      let resolveSearch!: (value: unknown) => void;
      searchSpotlightItemsMock.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSearch = resolve;
          }),
      );

      const input = container.querySelector(
        "input[type='text']",
      ) as HTMLInputElement;

      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value",
        )?.set;
        setter?.call(input, "xyz");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });

      await act(async () => {
        vi.advanceTimersByTime(250);
      });

      expect(searchSpotlightItemsMock).toHaveBeenCalledWith("xyz", null);

      // Enter enquanto a busca de "xyz" ainda está pendente: os itens
      // visíveis são os do carregamento inicial (chave antiga) -- não deve
      // agir neles.
      await act(async () => {
        input.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Enter",
            bubbles: true,
            cancelable: true,
          }),
        );
      });

      expect(copyToClipboardMock).not.toHaveBeenCalled();
      expect(getItemDetailsMock).not.toHaveBeenCalled();

      // Resultado fresco chega para a chave atual ("xyz").
      await act(async () => {
        resolveSearch({
          ok: true,
          data: {
            items: [
              {
                id: "item-fresh",
                type: "prompt",
                title: "Item Fresco",
                contentPreview: "conteúdo",
                tagIds: [],
              },
            ],
            tags: [],
            hasMore: false,
          },
        });
      });

      // A ação em si é adiada para uma macrotask (ver comentário no efeito
      // de pending-Enter); libera esse `setTimeout(0)`.
      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      expect(getItemDetailsMock).toHaveBeenCalledWith("item-fresh");
      expect(copyToClipboardMock).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }

    await act(async () => root.unmount());
    container.remove();
  });

  it("mostra erro com retry quando res.ok é false e limpa os itens anteriores", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MuvucaSpotlight
          open={true}
          onOpenChange={vi.fn()}
          initialTags={mockTags}
        />,
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(container.textContent).toContain("Supabase Documentation");

    searchSpotlightItemsMock.mockResolvedValueOnce({
      ok: false,
      code: "UNKNOWN",
      message: "Erro genérico.",
    });

    const input = container.querySelector(
      "input[type='text']",
    ) as HTMLInputElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "err");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    expect(container.textContent).toContain(
      "Não foi possível carregar os itens.",
    );
    expect(container.textContent).not.toContain("Supabase Documentation");
    expect(container.textContent).not.toContain("Prompt Code Reviewer");

    const retryButton = [...container.querySelectorAll("button")].find(
      (btn) => btn.textContent === "Tentar de novo",
    );
    expect(retryButton).toBeDefined();

    searchSpotlightItemsMock.mockResolvedValueOnce({
      ok: true,
      data: {
        items: [
          {
            id: "item-retry",
            type: "prompt",
            title: "Recuperado Após Retry",
            contentPreview: "",
            tagIds: [],
          },
        ],
        tags: [],
        hasMore: false,
      },
    });

    await act(async () => {
      retryButton?.click();
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    expect(searchSpotlightItemsMock).toHaveBeenCalledWith("err", null);
    expect(container.textContent).not.toContain(
      "Não foi possível carregar os itens.",
    );
    expect(container.textContent).toContain("Recuperado Após Retry");

    await act(async () => root.unmount());
    container.remove();
  });

  it("também mostra erro quando a promise de busca rejeita, sem unhandled rejection", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<MuvucaSpotlight open={true} onOpenChange={vi.fn()} />);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    searchSpotlightItemsMock.mockRejectedValueOnce(new Error("network down"));

    const input = container.querySelector(
      "input[type='text']",
    ) as HTMLInputElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "boom");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    expect(container.textContent).toContain(
      "Não foi possível carregar os itens.",
    );

    await act(async () => root.unmount());
    container.remove();
  });

  it("no modo escuro do sistema (sem classe em <html>), alternar tema chama setTheme('light')", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    document.documentElement.classList.remove("dark", "light");
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: query.includes("dark"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });

    getSpotlightInitialDataMock.mockResolvedValueOnce({
      ok: true,
      data: { items: [], tags: [], hasMore: false },
    });

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<MuvucaSpotlight open={true} onOpenChange={vi.fn()} />);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const input = container.querySelector(
      "input[type='text']",
    ) as HTMLInputElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "tema");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    expect(setThemeMock).toHaveBeenCalledWith("light");

    await act(async () => root.unmount());
    container.remove();
  });

  it("fecha e reabre: input volta vazio e filtro de tag é limpo", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MuvucaSpotlight
          open={true}
          onOpenChange={vi.fn()}
          initialTags={mockTags}
        />,
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const input = container.querySelector(
      "input[type='text']",
    ) as HTMLInputElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "algo");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const tagButton = [...container.querySelectorAll("button")].find(
      (btn) => btn.textContent === "Dev",
    );

    await act(async () => {
      tagButton?.click();
    });

    expect(
      (container.querySelector("input[type='text']") as HTMLInputElement).value,
    ).toBe("algo");

    await act(async () => {
      root.render(
        <MuvucaSpotlight
          open={false}
          onOpenChange={vi.fn()}
          initialTags={mockTags}
        />,
      );
    });

    await act(async () => {
      root.render(
        <MuvucaSpotlight
          open={true}
          onOpenChange={vi.fn()}
          initialTags={mockTags}
        />,
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const reopenedInput = container.querySelector(
      "input[type='text']",
    ) as HTMLInputElement;
    expect(reopenedInput.value).toBe("");

    // No mais "Todas": aria-pressed no próprio chip é o único estado --
    // reabrir deve limpar o filtro escolhido antes de fechar.
    const devChipReopened = [...container.querySelectorAll("button")].find(
      (btn) => btn.textContent === "Dev",
    );
    expect(devChipReopened?.getAttribute("aria-pressed")).toBe("false");

    await act(async () => root.unmount());
    container.remove();
  });

  it("com hasMore, mostra contagem '48+ itens' e 'Ver todos na biblioteca' navega com o filtro", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<MuvucaSpotlight open={true} onOpenChange={vi.fn()} />);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const items48 = Array.from({ length: 48 }, (_, i) => ({
      id: `item-${i}`,
      type: "prompt" as const,
      title: `Item ${i}`,
      contentPreview: "",
      tagIds: [],
    }));

    searchSpotlightItemsMock.mockResolvedValueOnce({
      ok: true,
      data: { items: items48, tags: [], hasMore: true },
    });

    const input = container.querySelector(
      "input[type='text']",
    ) as HTMLInputElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "item");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    expect(container.textContent).toContain("48+ itens");

    const seeAllOption = [
      ...container.querySelectorAll("[role='option']"),
    ].find((el) => el.textContent?.includes("Ver todos na biblioteca"));
    expect(seeAllOption).toBeDefined();

    await act(async () => {
      (seeAllOption as HTMLElement).click();
    });

    expect(pushMock).toHaveBeenCalledWith("/library?q=item");

    await act(async () => root.unmount());
    container.remove();
  });

  it("ordena item com match no título antes de item com match só no conteúdo", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<MuvucaSpotlight open={true} onOpenChange={vi.fn()} />);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // O RPC devolve os itens newest-first: o match só no conteúdo aparece
    // primeiro na resposta do servidor, mas o título deve vencer no cliente.
    searchSpotlightItemsMock.mockResolvedValueOnce({
      ok: true,
      data: {
        items: [
          {
            id: "item-body-only",
            type: "prompt",
            title: "Anotações Diversas",
            description: "Fala sobre revisão de código aqui",
            contentPreview: "",
            tagIds: [],
          },
          {
            id: "item-title-match",
            type: "prompt",
            title: "Revisão de código",
            contentPreview: "",
            tagIds: [],
          },
        ],
        tags: [],
        hasMore: false,
      },
    });

    const input = container.querySelector(
      "input[type='text']",
    ) as HTMLInputElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "revisão");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    const optionTitles = [...container.querySelectorAll("[role='option']")]
      .map((el) => el.textContent ?? "")
      .filter((text) => text.includes("Revisão") || text.includes("Anotações"));

    expect(optionTitles[0]).toContain("Revisão de código");
    expect(optionTitles[1]).toContain("Anotações Diversas");

    await act(async () => root.unmount());
    container.remove();
  });

  it("region role='status' diz 'Buscando…' enquanto a busca está pendente", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<MuvucaSpotlight open={true} onOpenChange={vi.fn()} />);
    });

    vi.useFakeTimers();
    try {
      let resolveSearch!: (value: unknown) => void;
      searchSpotlightItemsMock.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSearch = resolve;
          }),
      );

      const input = container.querySelector(
        "input[type='text']",
      ) as HTMLInputElement;

      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value",
        )?.set;
        setter?.call(input, "zzz");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });

      await act(async () => {
        vi.advanceTimersByTime(250);
      });

      const status = container.querySelector("[role='status']");
      expect(status?.textContent).toBe("Buscando…");

      // Resolve before switching back to real timers -- an unmount with the
      // async transition still stuck pending leaks a scheduled callback
      // into React's (module-global) Scheduler that surfaces as flakiness
      // in whichever test happens to run next.
      await act(async () => {
        resolveSearch({
          ok: true,
          data: { items: [], tags: [], hasMore: false },
        });
      });
    } finally {
      vi.useRealTimers();
    }

    await act(async () => root.unmount());
    container.remove();
  });

  it("region role='status' mostra a contagem, ou a mensagem de nenhum item, quando os resultados chegam frescos", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<MuvucaSpotlight open={true} onOpenChange={vi.fn()} />);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const input = container.querySelector(
      "input[type='text']",
    ) as HTMLInputElement;
    const status = () => container.querySelector("[role='status']");

    searchSpotlightItemsMock.mockResolvedValueOnce({
      ok: true,
      data: { items: [], tags: [], hasMore: false },
    });

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "zzz");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    expect(status()?.textContent).toBe('Nenhum item encontrado para "zzz".');

    searchSpotlightItemsMock.mockResolvedValueOnce({
      ok: true,
      data: {
        items: [
          {
            id: "item-x",
            type: "prompt",
            title: "Item X",
            contentPreview: "",
            tagIds: [],
          },
        ],
        tags: [],
        hasMore: false,
      },
    });

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "zzza");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    expect(status()?.textContent).toBe("1 item");

    await act(async () => root.unmount());
    container.remove();
  });

  it("estado vazio fica fora do listbox; 'Limpar busca' limpa o input e foca nele", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<MuvucaSpotlight open={true} onOpenChange={vi.fn()} />);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    searchSpotlightItemsMock.mockResolvedValueOnce({
      ok: true,
      data: { items: [], tags: [], hasMore: false },
    });

    const input = container.querySelector(
      "input[type='text']",
    ) as HTMLInputElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "nada");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    const listbox = container.querySelector("[role='listbox']");
    const clearButton = [...container.querySelectorAll("button")].find(
      (btn) => btn.textContent === "Limpar busca",
    );
    expect(clearButton).toBeDefined();
    expect(listbox?.contains(clearButton!)).toBe(false);

    await act(async () => {
      clearButton!.click();
    });

    expect(input.value).toBe("");
    expect(document.activeElement).toBe(input);

    await act(async () => root.unmount());
    container.remove();
  });

  it("chips de tag expõem aria-pressed e devolvem o foco ao input ao clicar", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MuvucaSpotlight
          open={true}
          onOpenChange={vi.fn()}
          initialTags={mockTags}
        />,
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const input = container.querySelector(
      "input[type='text']",
    ) as HTMLInputElement;
    const devChip = [...container.querySelectorAll("button")].find(
      (btn) => btn.textContent === "Dev",
    );

    expect(devChip?.getAttribute("aria-pressed")).toBe("false");

    await act(async () => {
      devChip!.click();
    });

    expect(devChip?.getAttribute("aria-pressed")).toBe("true");
    expect(document.activeElement).toBe(input);

    // Clicar de novo no chip já pressionado limpa o filtro -- não há mais
    // um chip "Todas" separado para isso.
    await act(async () => {
      devChip!.click();
    });

    expect(devChip?.getAttribute("aria-pressed")).toBe("false");
    expect(document.activeElement).toBe(input);

    await act(async () => root.unmount());
    container.remove();
  });

  it("viewport estreito: abrir a prévia foca seu botão de fechar; fechar devolve o foco ao input", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    // A prévia REPLACES a lista abaixo de `sm` -- só nesse layout compacto
    // faz sentido mover o foco para dentro dela, já que não sobra mais nada
    // na tela para receber foco.
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: query.includes("639.98"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MuvucaSpotlight
          open={true}
          onOpenChange={vi.fn()}
          initialTags={mockTags}
        />,
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const input = container.querySelector(
      "input[type='text']",
    ) as HTMLInputElement;

    // Busca vazia: as 5 ações vêm antes dos "Recentes" -- desce até o
    // primeiro item para ter um `currentItem` real.
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        input.dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
        );
      }
    });

    // Caret no fim de um valor vazio: trivialmente 0 === 0 === length.
    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
    });

    const closeButton = [...container.querySelectorAll("button")].find(
      (btn) => btn.getAttribute("aria-label") === "Fechar pré-visualização",
    );
    expect(closeButton).toBeDefined();
    expect(document.activeElement).toBe(closeButton);

    await act(async () => {
      closeButton!.click();
    });

    expect(
      container.querySelector('[aria-label="Pré-visualização do item"]'),
    ).toBeNull();
    expect(document.activeElement).toBe(input);

    await act(async () => root.unmount());
    container.remove();
  });

  it("region role='status' fica em silêncio ao abrir com busca vazia, mesmo com a revalidação dos recentes pendente", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    let resolveInitial!: (value: unknown) => void;
    getSpotlightInitialDataMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInitial = resolve;
        }),
    );

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<MuvucaSpotlight open={true} onOpenChange={vi.fn()} />);
    });

    // Busca vazia + carregamento inicial ainda pendente (`isSearching` true):
    // a spec pede silêncio aqui, não "Buscando…", já que reabrir o spotlight
    // sempre revalida os recentes em segundo plano.
    const status = container.querySelector("[role='status']");
    expect(status?.textContent).toBe("");

    await act(async () => {
      resolveInitial({ ok: true, data: initialMockData });
    });

    // Resultados frescos chegaram, mas a busca continua vazia: ainda deve
    // ficar em silêncio (não anuncia a contagem de "Recentes").
    expect(container.querySelector("[role='status']")?.textContent).toBe("");

    await act(async () => root.unmount());
    container.remove();
  });

  it("opção selecionada tem o marcador lateral lime; as demais não", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MuvucaSpotlight
          open={true}
          onOpenChange={vi.fn()}
          initialTags={mockTags}
        />,
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const options = [...container.querySelectorAll("[role='option']")];
    expect(options.length).toBeGreaterThan(1);

    const selected = options.find(
      (el) => el.getAttribute("aria-selected") === "true",
    );
    const unselected = options.find(
      (el) => el.getAttribute("aria-selected") === "false",
    );
    expect(selected).toBeDefined();
    expect(unselected).toBeDefined();

    // O marcador é o span absolute/left-0.5/bg-primary do commit 4 -- só a
    // linha selecionada deve ter um.
    expect(selected!.querySelector('span[class*="left-0.5"]')).not.toBeNull();
    expect(unselected!.querySelector('span[class*="left-0.5"]')).toBeNull();

    await act(async () => root.unmount());
    container.remove();
  });

  it("linha do item mostra o rótulo do tipo e o caminho da tag até o pai", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<MuvucaSpotlight open={true} onOpenChange={vi.fn()} />);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    searchSpotlightItemsMock.mockResolvedValueOnce({
      ok: true,
      data: {
        items: [
          {
            id: "item-tag-path",
            type: "link",
            title: "Documentação interna",
            url: "https://example.com/doc",
            tagIds: ["tag-child"],
          },
        ],
        tags: [
          {
            id: "tag-parent",
            name: "Trabalho",
            description: null,
            colorToken: "lime",
            parentId: null,
            path: "trabalho",
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
          },
          {
            id: "tag-child",
            name: "Cliente X",
            description: null,
            colorToken: "blue",
            parentId: "tag-parent",
            path: "trabalho/cliente-x",
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
          },
        ],
        hasMore: false,
      },
    });

    const input = container.querySelector(
      "input[type='text']",
    ) as HTMLInputElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "documentação");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    const option = [...container.querySelectorAll("[role='option']")].find(
      (el) => el.textContent?.includes("Documentação interna"),
    );
    expect(option).toBeDefined();
    expect(option!.textContent).toContain("link");
    expect(option!.textContent).toContain("Trabalho › Cliente X");

    await act(async () => root.unmount());
    container.remove();
  });

  it("item code sem linguagem não mostra texto de linguagem", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<MuvucaSpotlight open={true} onOpenChange={vi.fn()} />);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    searchSpotlightItemsMock.mockResolvedValueOnce({
      ok: true,
      data: {
        items: [
          {
            id: "item-code-no-lang",
            type: "code_component",
            title: "Snippet sem linguagem",
            language: null,
            contentPreview: "console.log('hi')",
            tagIds: [],
          },
        ],
        tags: [],
        hasMore: false,
      },
    });

    const input = container.querySelector(
      "input[type='text']",
    ) as HTMLInputElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "snippet");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    const option = [...container.querySelectorAll("[role='option']")].find(
      (el) => el.textContent?.includes("Snippet sem linguagem"),
    );
    expect(option).toBeDefined();
    expect(option!.textContent).toContain("code");
    // Sem linguagem, sem tags, sem domínio: nenhum separador "·" deveria
    // sobrar na linha de meta.
    expect(option!.textContent?.match(/·/g)).toBeNull();

    await act(async () => root.unmount());
    container.remove();
  });
});
