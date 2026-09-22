import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QuickLookPreview } from "@/components/spotlight/QuickLookPreview";
import type { LibraryItemSummary } from "@/lib/database/queries/items";

const { copyToClipboardMock, getItemDetailsMock } = vi.hoisted(() => ({
  copyToClipboardMock: vi.fn().mockResolvedValue(true),
  getItemDetailsMock: vi.fn(),
}));

vi.mock("@/lib/clipboard", () => ({
  copyToClipboard: copyToClipboardMock,
}));

vi.mock("@/lib/actions/items", () => ({
  getItemDetails: getItemDetailsMock,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("QuickLookPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("busca o conteúdo completo com getItemDetails ao clicar em copiar prompt", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

    const promptItem: LibraryItemSummary = {
      id: "prompt-1",
      type: "prompt",
      title: "Prompt de Arquitetura",
      description: "Instruções do sistema",
      contentPreview: "Resumo curto...",
      url: null,
      tagIds: [],
    };

    getItemDetailsMock.mockResolvedValueOnce({
      ok: true,
      data: {
        id: "prompt-1",
        type: "prompt",
        title: "Prompt de Arquitetura",
        content: "Conteúdo completo com 4000 caracteres de instruções...",
        url: null,
        description: "Instruções do sistema",
        tagIds: [],
      },
    });

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <QuickLookPreview item={promptItem} tags={[]} onClose={vi.fn()} />,
      );
    });

    expect(container.textContent).toContain("Copiar prompt");

    const promptCopyBtn = [...container.querySelectorAll("button")].find(
      (btn) => btn.textContent?.includes("Copiar prompt"),
    );

    expect(promptCopyBtn).not.toBeNull();

    await act(async () => {
      promptCopyBtn?.click();
    });

    expect(getItemDetailsMock).toHaveBeenCalledWith("prompt-1");
    expect(copyToClipboardMock).toHaveBeenCalled();

    // Verifica que o valor passado para o copyToClipboard resolve para o conteúdo completo
    const passedPromise = copyToClipboardMock.mock.calls[0]?.[0];
    const resolvedContent = await passedPromise;
    expect(resolvedContent).toBe(
      "Conteúdo completo com 4000 caracteres de instruções...",
    );

    await act(async () => root.unmount());
    container.remove();
  });

  it("valida a URL com normalizeHttpUrl antes de abrir nova aba", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    const linkItem: LibraryItemSummary = {
      id: "link-1",
      type: "link",
      title: "Documentação",
      description: "Docs",
      url: "https://example.com/page",
      tagIds: [],
      preview: null,
    };

    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <QuickLookPreview item={linkItem} tags={[]} onClose={vi.fn()} />,
      );
    });

    const openBtn = [...container.querySelectorAll("button")].find((btn) =>
      btn.textContent?.includes("Abrir página"),
    );
    expect(openBtn).not.toBeNull();

    await act(async () => {
      openBtn?.click();
    });

    expect(openSpy).toHaveBeenCalledWith(
      "https://example.com/page",
      "_blank",
      "noopener,noreferrer",
    );

    openSpy.mockRestore();
    await act(async () => root.unmount());
    container.remove();
  });
});
