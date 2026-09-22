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

// Mock spotlight Server Actions
vi.mock("@/lib/actions/spotlight", () => ({
  getSpotlightInitialData: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      items: [
        {
          id: "item-1",
          type: "link",
          title: "Supabase Documentation",
          description: "Docs for Supabase Auth and Database",
          url: "https://supabase.com/docs",
          tagIds: ["tag-1"],
          preview: null,
        },
        {
          id: "item-2",
          type: "prompt",
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
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
        {
          id: "tag-2",
          name: "Prompts",
          description: null,
          colorToken: "blue",
          parentId: null,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      ],
    },
  }),
  searchSpotlightItems: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      items: [],
      tags: [],
    },
  }),
}));

const mockTags: Tag[] = [
  {
    id: "tag-1",
    name: "Dev",
    description: null,
    colorToken: "lime",
    parentId: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    id: "tag-2",
    name: "Prompts",
    description: null,
    colorToken: "blue",
    parentId: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
];

describe("MuvucaSpotlight", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(dialogMatch).toContain('aria-label="Muvuca Spotlight — Busca rápida"');
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
});
