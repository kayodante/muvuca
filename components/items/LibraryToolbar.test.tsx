import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LibraryToolbar } from "./LibraryToolbar";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.clearAllMocks();
});

async function renderToolbar(
  props: Partial<Parameters<typeof LibraryToolbar>[0]> = {},
) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  const defaultProps = {
    type: null,
    sort: "newest" as const,
    isPending: false,
    canRefreshPreviews: false,
    isRefreshingPreviews: false,
    onRefreshPreviews: vi.fn(),
    onFilterChange: vi.fn(),
  };

  await act(async () => {
    root?.render(<LibraryToolbar {...defaultProps} {...props} />);
  });

  return container;
}

describe("LibraryToolbar", () => {
  it("renderiza as abas de tipo com 'Tudo' ativa por padrão", async () => {
    const dom = await renderToolbar();

    const group = dom.querySelector(
      '[role="group"][aria-label="Filtrar por tipo"]',
    );
    expect(group).not.toBeNull();

    const buttons = Array.from(group?.querySelectorAll("button") ?? []);
    expect(buttons.map((btn) => btn.textContent)).toEqual([
      "Tudo",
      "Link",
      "Prompt",
      "Code",
    ]);
    expect(
      buttons
        .find((btn) => btn.textContent === "Tudo")
        ?.getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("dispara onFilterChange com o tipo ao clicar numa aba", async () => {
    const onFilterChange = vi.fn();
    const dom = await renderToolbar({ onFilterChange });

    const promptTab = Array.from(dom.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Prompt",
    );
    expect(promptTab).not.toBeUndefined();

    await act(async () => {
      promptTab?.click();
    });

    expect(onFilterChange).toHaveBeenCalledWith({ type: "prompt" });
  });

  it("marca a aba ativa conforme o tipo selecionado", async () => {
    const dom = await renderToolbar({ type: "code_component" });

    const codeTab = Array.from(dom.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Code",
    );
    expect(codeTab?.getAttribute("aria-pressed")).toBe("true");

    const allTab = Array.from(dom.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Tudo",
    );
    expect(allTab?.getAttribute("aria-pressed")).toBe("false");
  });

  it("mostra o botão de ordenar com o rótulo do sort atual", async () => {
    const dom = await renderToolbar({ sort: "title_asc" });

    const sortTrigger = dom.querySelector('button[aria-label="Ordenar itens"]');
    expect(sortTrigger).not.toBeNull();
    expect(sortTrigger?.textContent).toContain("Título A–Z");
  });

  it("exibe indicador de carregamento quando isPending for true", async () => {
    const dom = await renderToolbar({ isPending: true });
    expect(dom.textContent).toContain("Carregando item…");
  });

  it("oculta 'Atualizar pré-visualizações' quando a página não tem item de link", async () => {
    const dom = await renderToolbar({ canRefreshPreviews: false });
    expect(dom.textContent).not.toContain("Atualizar pré-visualizações");
  });

  it("dispara onRefreshPreviews ao clicar em 'Atualizar pré-visualizações'", async () => {
    const onRefreshPreviews = vi.fn();
    const dom = await renderToolbar({
      canRefreshPreviews: true,
      onRefreshPreviews,
    });

    const refreshButton = Array.from(dom.querySelectorAll("button")).find(
      (btn) => btn.textContent?.includes("Atualizar pré-visualizações"),
    );
    expect(refreshButton).not.toBeUndefined();
    expect(refreshButton?.hasAttribute("disabled")).toBe(false);

    await act(async () => {
      refreshButton?.click();
    });

    expect(onRefreshPreviews).toHaveBeenCalledOnce();
  });

  it("mostra o rótulo 'Atualizando' e desabilita o botão enquanto as prévias são atualizadas", async () => {
    const dom = await renderToolbar({
      canRefreshPreviews: true,
      isRefreshingPreviews: true,
    });

    const pendingButton = dom.querySelector('button[aria-busy="true"]');
    expect(pendingButton).not.toBeNull();
    expect(pendingButton?.textContent).toContain("Atualizando");
    expect(pendingButton?.hasAttribute("disabled")).toBe(true);
  });

  it("mostra 'Atualizado' por 1500ms depois de um clique e então volta ao rótulo padrão", async () => {
    vi.useFakeTimers();
    try {
      const props = {
        type: null,
        sort: "newest" as const,
        isPending: false,
        canRefreshPreviews: true,
        onRefreshPreviews: vi.fn(),
        onFilterChange: vi.fn(),
      };
      const dom = await renderToolbar({
        ...props,
        isRefreshingPreviews: false,
      });

      const refreshButton = Array.from(dom.querySelectorAll("button")).find(
        (btn) => btn.textContent?.includes("Atualizar pré-visualizações"),
      );
      await act(async () => {
        refreshButton?.click();
      });

      // Simula o pai propagando isDraining=true e depois false, como o
      // usePreviewDrain faz ao concluir a rodada disparada pelo clique.
      await act(async () => {
        root?.render(<LibraryToolbar {...props} isRefreshingPreviews={true} />);
      });
      await act(async () => {
        root?.render(
          <LibraryToolbar {...props} isRefreshingPreviews={false} />,
        );
      });

      expect(dom.textContent).toContain("Atualizado");
      expect(dom.textContent).not.toContain("Atualizar pré-visualizações");

      await act(async () => {
        vi.advanceTimersByTime(1500);
      });

      expect(dom.textContent).toContain("Atualizar pré-visualizações");
    } finally {
      vi.useRealTimers();
    }
  });

  it("não mostra 'Atualizado' quando a drenagem automática termina sem clique no botão", async () => {
    const props = {
      type: null,
      sort: "newest" as const,
      isPending: false,
      canRefreshPreviews: true,
      onRefreshPreviews: vi.fn(),
      onFilterChange: vi.fn(),
    };
    const dom = await renderToolbar({ ...props, isRefreshingPreviews: true });

    await act(async () => {
      root?.render(<LibraryToolbar {...props} isRefreshingPreviews={false} />);
    });

    expect(dom.textContent).not.toContain("Atualizado");
    expect(dom.textContent).toContain("Atualizar pré-visualizações");
  });
});
