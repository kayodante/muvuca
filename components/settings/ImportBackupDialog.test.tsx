import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/backup", () => ({ importLibraryBackup: vi.fn() }));

import { importLibraryBackup } from "@/lib/actions/backup";
import { ImportBackupDialog } from "@/components/settings/ImportBackupDialog";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.clearAllMocks();
});

describe("ImportBackupDialog", () => {
  it("mostra o estado vazio com o aviso de que nada é apagado", async () => {
    await act(async () => {
      root?.render(<ImportBackupDialog open={true} onOpenChange={() => {}} />);
    });

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(document.body.textContent).toContain("Restaurar backup");
    expect(document.body.textContent).toMatch(/nada é apagado/i);
  });

  const file = () =>
    new File(
      [
        JSON.stringify({
          version: "1.0",
          exportedAt: "2026-08-16T12:00:00+00:00",
          tags: [],
          items: [],
        }),
      ],
      "b.json",
      { type: "application/json" },
    );

  async function pickAndConfirm(label: string) {
    const input =
      document.body.querySelector<HTMLInputElement>('input[type="file"]')!;
    await act(async () => {
      Object.defineProperty(input, "files", { value: [file()] });
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const button = [...document.body.querySelectorAll("button")].find(
      (b) => b.textContent === label,
    )!;
    await act(async () => button.click());
  }

  it("modo destino mostra textos do destino, envia targetTagId e exibe erro", async () => {
    vi.mocked(importLibraryBackup).mockResolvedValue({
      ok: false,
      code: "VALIDATION_FAILED",
      message: "Hierarquia profunda demais.",
    });
    await act(async () => {
      root?.render(
        <ImportBackupDialog
          open={true}
          onOpenChange={() => {}}
          targetTag={{ id: "t-1", name: "Design" }}
        />,
      );
    });
    expect(document.body.textContent).toContain("Importar para Design");
    expect(document.body.textContent).toContain("subtags de Design");

    await pickAndConfirm("Confirmar importação");
    expect(importLibraryBackup).toHaveBeenCalledWith({
      tags: [],
      items: [],
      targetTagId: "t-1",
    });
    expect(
      document.body.querySelector('[role="alert"]')?.textContent,
    ).toContain("Hierarquia profunda demais.");
  });

  it("sem targetTag o payload não leva targetTagId", async () => {
    vi.mocked(importLibraryBackup).mockResolvedValue({
      ok: false,
      code: "VALIDATION_FAILED",
      message: "falhou",
    });
    await act(async () => {
      root?.render(<ImportBackupDialog open={true} onOpenChange={() => {}} />);
    });
    await pickAndConfirm("Confirmar restauração");
    expect(importLibraryBackup).toHaveBeenCalledWith({ tags: [], items: [] });
  });
});
