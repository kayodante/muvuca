// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// @ts-expect-error test act environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { toastMock, exportUserLibraryMock, formatAsNetscapeBookmarksMock } =
  vi.hoisted(() => ({
    toastMock: {
      success: vi.fn(),
      error: vi.fn(),
    },
    exportUserLibraryMock: vi.fn(),
    formatAsNetscapeBookmarksMock: vi.fn(),
  }));

vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("@/lib/actions/export", () => ({
  exportUserLibrary: exportUserLibraryMock,
}));
vi.mock("@/lib/export/formatter", () => ({
  formatAsNetscapeBookmarks: formatAsNetscapeBookmarksMock,
}));

import { ExportLibraryCard } from "./ExportLibraryCard";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  // Mock window.URL methods
  global.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
  global.URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

async function renderCard(): Promise<HTMLDivElement> {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(<ExportLibraryCard />);
  });

  return container;
}

describe("ExportLibraryCard", () => {
  it("renderiza o card de exportação com título, descrição e botões de ação", async () => {
    const el = await renderCard();

    expect(el.textContent).toContain("Exportar dados");
    expect(el.textContent).toContain(
      "Baixe uma cópia completa de todos os seus links, prompts e tags.",
    );
    expect(el.textContent).toContain("Exportar JSON (Completo)");
    expect(el.textContent).toContain("Exportar HTML Bookmarks");
  });

  it("faz download de JSON quando o botão de exportar JSON é acionado", async () => {
    const mockData = {
      version: "1.0",
      exportedAt: "2026-08-15T00:00:00Z",
      tags: [],
      items: [],
    };
    exportUserLibraryMock.mockResolvedValue({ ok: true, data: mockData });

    const el = await renderCard();
    const buttons = el.querySelectorAll("button");
    const jsonButton = Array.from(buttons).find((b) =>
      b.textContent?.includes("Exportar JSON"),
    );
    expect(jsonButton).toBeDefined();

    await act(async () => {
      jsonButton?.click();
    });

    expect(exportUserLibraryMock).toHaveBeenCalledTimes(1);
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    expect(toastMock.success).toHaveBeenCalledWith(
      "Backup JSON exportado com sucesso.",
    );
  });

  it("faz download de HTML Netscape quando o botão de exportar HTML é acionado", async () => {
    const mockData = {
      version: "1.0",
      exportedAt: "2026-08-15T00:00:00Z",
      tags: [],
      items: [],
    };
    exportUserLibraryMock.mockResolvedValue({ ok: true, data: mockData });
    formatAsNetscapeBookmarksMock.mockReturnValue(
      "<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><p></DL><p>",
    );

    const el = await renderCard();
    const buttons = el.querySelectorAll("button");
    const htmlButton = Array.from(buttons).find((b) =>
      b.textContent?.includes("Exportar HTML Bookmarks"),
    );
    expect(htmlButton).toBeDefined();

    await act(async () => {
      htmlButton?.click();
    });

    expect(exportUserLibraryMock).toHaveBeenCalledTimes(1);
    expect(formatAsNetscapeBookmarksMock).toHaveBeenCalledWith(mockData);
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    expect(toastMock.success).toHaveBeenCalledWith(
      "Favoritos HTML exportados com sucesso.",
    );
  });

  it("exibe toast de erro quando a action exportUserLibrary falha", async () => {
    exportUserLibraryMock.mockResolvedValue({
      ok: false,
      code: "UNKNOWN",
      message: "Falha ao gerar dados de exportação.",
    });

    const el = await renderCard();
    const buttons = el.querySelectorAll("button");
    const jsonButton = Array.from(buttons).find((b) =>
      b.textContent?.includes("Exportar JSON"),
    );

    await act(async () => {
      jsonButton?.click();
    });

    expect(exportUserLibraryMock).toHaveBeenCalledTimes(1);
    expect(toastMock.error).toHaveBeenCalledWith(
      "Falha ao gerar dados de exportação.",
    );
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });
});
