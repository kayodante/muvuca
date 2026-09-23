import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MuvucaSpotlight } from "@/components/spotlight/MuvucaSpotlight";
import type { Tag } from "@/lib/database/queries/tags";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
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
};

const {
  getSpotlightInitialDataMock,
  searchSpotlightItemsMock,
  getItemDetailsMock,
  copyToClipboardMock,
} = vi.hoisted(() => ({
  getSpotlightInitialDataMock: vi.fn(),
  searchSpotlightItemsMock: vi.fn(),
  getItemDetailsMock: vi.fn(),
  copyToClipboardMock: vi.fn().mockResolvedValue(true),
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
  });

  it("renderiza o input de busca, badge de marca, ações e atalhos quando aberto", () => {
    const handleOpenChange = vi.fn();
    const markup = renderToStaticMarkup(
      <MuvucaSpotlight
        open={true}
        onOpenChange={handleOpenChange}
        initialTags={mockTags}
      />,
    );

    expect(markup).toContain("MUVUCA SPOTLIGHT");
    expect(markup).toContain("Buscar links, prompts, código ou ações...");
    expect(markup).toContain("Filtrar por tag:");
    expect(markup).toContain("Criar novo item");
    expect(markup).toContain("Ir para Biblioteca");
    expect(markup).toContain("navegar");
    expect(markup).toContain("selecionar");
    expect(markup).toContain("espiar");
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
    expect(dialogMatch).toContain(
      'aria-label="Muvuca Spotlight — Busca rápida"',
    );
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

  it("abre e fecha o painel de Quick Look via botão de espiar", async () => {
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

    // Procura o botão de espiar do item
    const eyeButtons = container.querySelectorAll(
      'button[aria-label="Espiar item (Quick Look)"]',
    );
    expect(eyeButtons.length).toBeGreaterThan(0);

    // Clica no primeiro botão de espiar
    await act(async () => {
      (eyeButtons[0] as HTMLButtonElement).click();
    });

    // Verifica se a região de Quick Look foi montada
    const quickLookRegion = container.querySelector(
      '[aria-label="Pré-visualização do item (Quick Look)"]',
    );
    expect(quickLookRegion).not.toBeNull();

    // Fecha a região de Quick Look com botão de fechar interno
    const closeBtn = quickLookRegion?.querySelector(
      'button[aria-label="Fechar pré-visualização"]',
    ) as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();

    await act(async () => {
      closeBtn.click();
    });

    expect(
      container.querySelector(
        '[aria-label="Pré-visualização do item (Quick Look)"]',
      ),
    ).toBeNull();

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

    // Navega com ArrowDown para selecionar o segundo item (Prompt Code Reviewer)
    // O primeiro item da lista é a primeira ação ("Criar novo item") ou item
    // Procura o id do item de prompt nas opções
    const promptOption = container.querySelector(
      "[role='option']:has([aria-label='Copiar prompt'])",
    );
    expect(promptOption).not.toBeNull();

    // Dispara clique no botão copiar do item
    const copyBtn = promptOption?.querySelector(
      "button[aria-label='Copiar prompt']",
    ) as HTMLButtonElement;
    expect(copyBtn).not.toBeNull();

    await act(async () => {
      copyBtn.click();
    });

    expect(getItemDetailsMock).toHaveBeenCalledWith("item-2");
    expect(copyToClipboardMock).toHaveBeenCalled();

    await act(async () => root.unmount());
    container.remove();
  });
});
