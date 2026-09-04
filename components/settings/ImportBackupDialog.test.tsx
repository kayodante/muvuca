import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/backup", () => ({ importLibraryBackup: vi.fn() }));

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
});
