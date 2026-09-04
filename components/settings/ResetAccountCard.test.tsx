import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { resetAccountMock, toastSuccessMock } = vi.hoisted(() => ({
  resetAccountMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock("@/lib/actions/account", () => ({ resetAccount: resetAccountMock }));
vi.mock("sonner", () => ({ toast: { success: toastSuccessMock } }));

import { ResetAccountCard } from "@/components/settings/ResetAccountCard";

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

function setInputValue(input: HTMLInputElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;
  nativeInputValueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

async function openDialog() {
  await act(async () => {
    root?.render(<ResetAccountCard />);
  });
  const trigger = document.body.querySelector("button") as HTMLButtonElement;
  await act(async () => {
    trigger.click();
  });
}

function confirmButton() {
  return Array.from(document.body.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Apagar tudo"),
  ) as HTMLButtonElement;
}

describe("ResetAccountCard", () => {
  it("mantém o botão de confirmação desabilitado até digitar a frase exata", async () => {
    await openDialog();
    const input = document.body.querySelector("input") as HTMLInputElement;

    expect(confirmButton().disabled).toBe(true);

    await act(async () => setInputValue(input, "apagar"));
    expect(confirmButton().disabled).toBe(true);

    await act(async () => setInputValue(input, "APAGAR"));
    expect(confirmButton().disabled).toBe(false);
  });

  it("chama resetAccount e mostra sucesso quando confirmado", async () => {
    resetAccountMock.mockResolvedValue({ ok: true, data: null });
    await openDialog();
    const input = document.body.querySelector("input") as HTMLInputElement;
    await act(async () => setInputValue(input, "APAGAR"));

    await act(async () => confirmButton().click());

    expect(resetAccountMock).toHaveBeenCalled();
    expect(toastSuccessMock).toHaveBeenCalled();
  });

  it("mostra a mensagem de erro sem fechar o diálogo quando a action falha", async () => {
    resetAccountMock.mockResolvedValue({
      ok: false,
      code: "UNKNOWN",
      message: "Não foi possível apagar os dados da conta.",
    });
    await openDialog();
    const input = document.body.querySelector("input") as HTMLInputElement;
    await act(async () => setInputValue(input, "APAGAR"));

    await act(async () => confirmButton().click());

    expect(document.body.textContent).toContain(
      "Não foi possível apagar os dados da conta.",
    );
    expect(document.body.querySelector('[role="alertdialog"]')).not.toBeNull();
  });
});
