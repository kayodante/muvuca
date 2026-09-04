import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ImportBookmarksDialog } from "@/components/bookmarks/ImportBookmarksDialog";
import { fail, ok } from "@/lib/utils/result";

const { toast } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const { findExistingBookmarkUrls, importBrowserBookmarks } = vi.hoisted(() => ({
  findExistingBookmarkUrls: vi.fn(),
  importBrowserBookmarks: vi.fn(),
}));

const { notifyPreviewQueueChangedMock } = vi.hoisted(() => ({
  notifyPreviewQueueChangedMock: vi.fn(),
}));

vi.mock("sonner", () => ({ toast }));
vi.mock("@/lib/actions/bookmarks", () => ({
  findExistingBookmarkUrls,
  importBrowserBookmarks,
}));
vi.mock("@/lib/events/preview-queue", () => ({
  notifyPreviewQueueChanged: notifyPreviewQueueChangedMock,
}));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  findExistingBookmarkUrls.mockResolvedValue(ok([]));
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.clearAllMocks();
});

describe("ImportBookmarksDialog", () => {
  it("renders file upload trigger when open", async () => {
    await act(async () => {
      root?.render(
        <ImportBookmarksDialog open={true} onOpenChange={() => {}} />,
      );
    });

    const fileInput = document.body.querySelector("input[type=file]");
    expect(fileInput).not.toBeNull();
    expect(document.body.textContent).toContain(
      "Selecione um arquivo .html de até 10 MB",
    );
  });

  // Informational line on the completion screen, telling the user
  // previews load in the background.
  it("informa que as prévias de link carregam em segundo plano na tela de conclusão", async () => {
    findExistingBookmarkUrls.mockResolvedValue(ok([]));
    importBrowserBookmarks.mockResolvedValue(
      ok({ itemsImported: 1, tagsCreated: 0, associationsCreated: 0 }),
    );

    await act(async () => {
      root?.render(
        <ImportBookmarksDialog open={true} onOpenChange={() => {}} />,
      );
    });

    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <TITLE>Bookmarks</TITLE>
      <H1>Bookmarks</H1>
      <DL><p>
        <DT><A HREF="https://example.com/a">A</A>
      </DL><p>
    `;
    const file = new File([html], "bookmarks.html", { type: "text/html" });
    const fileInput = document.body.querySelector(
      "input[type=file]",
    ) as HTMLInputElement;

    await act(async () => {
      Object.defineProperty(fileInput, "files", {
        value: [file],
        configurable: true,
      });
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const confirmButton = Array.from(
      document.body.querySelectorAll("button"),
    ).find((btn) => btn.textContent === "Confirmar importação");
    await act(async () => {
      confirmButton?.click();
    });

    expect(document.body.textContent).toContain(
      "As prévias de link (miniatura, favicon, título e descrição remotos) carregam em segundo plano.",
    );
    // An import must wake a drain session that
    // already found the queue empty and stopped looping.
    expect(notifyPreviewQueueChangedMock).toHaveBeenCalled();
  });

  it("renders preview with separated duplicate counters", async () => {
    findExistingBookmarkUrls.mockResolvedValue(ok(["https://example.com/a"]));

    await act(async () => {
      root?.render(
        <ImportBookmarksDialog open={true} onOpenChange={() => {}} />,
      );
    });

    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <TITLE>Bookmarks</TITLE>
      <H1>Bookmarks</H1>
      <DL><p>
        <DT><A HREF="https://example.com/a">A1</A>
        <DT><A HREF="https://example.com/a">A2</A>
        <DT><A HREF="https://example.com/b">B</A>
      </DL><p>
    `;
    const file = new File([html], "bookmarks.html", { type: "text/html" });

    const fileInput = document.body.querySelector(
      "input[type=file]",
    ) as HTMLInputElement;

    await act(async () => {
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      // Simulate selectFile by passing files
      Object.defineProperty(fileInput, "files", {
        value: [file],
        configurable: true,
      });
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const counts = Array.from(
      document.body.querySelectorAll(".text-metadata"),
    ).map((el) => ({
      label: el.textContent,
      value: el.nextElementSibling?.textContent,
    }));

    expect(counts).toContainEqual({
      label: "Já na biblioteca",
      value: "1",
    });
    expect(counts).toContainEqual({
      label: "Repetidos no arquivo",
      value: "1",
    });
    expect(counts).toContainEqual({
      label: "Pastas",
      value: "0",
    });
    expect(counts).toContainEqual({
      label: "Links válidos",
      value: "3",
    });
    expect(counts).toContainEqual({
      label: "Ignorados",
      value: "0",
    });
  });

  it("displays dash when duplicate check fails", async () => {
    findExistingBookmarkUrls.mockResolvedValue(
      fail("UNKNOWN", "Erro ao verificar duplicatas"),
    );

    await act(async () => {
      root?.render(
        <ImportBookmarksDialog open={true} onOpenChange={() => {}} />,
      );
    });

    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <TITLE>Bookmarks</TITLE>
      <H1>Bookmarks</H1>
      <DL><p>
        <DT><A HREF="https://example.com/a">A</A>
      </DL><p>
    `;
    const file = new File([html], "bookmarks.html", { type: "text/html" });

    const fileInput = document.body.querySelector(
      "input[type=file]",
    ) as HTMLInputElement;

    await act(async () => {
      Object.defineProperty(fileInput, "files", {
        value: [file],
        configurable: true,
      });
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(document.body.textContent).toContain("Erro ao verificar duplicatas");
    expect(document.body.textContent).toContain("—");
  });
});
