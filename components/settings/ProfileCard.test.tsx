import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { setDisplayNameMock, toastSuccessMock } = vi.hoisted(() => ({
  setDisplayNameMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock("@/lib/actions/profile", () => ({
  setDisplayName: setDisplayNameMock,
}));
vi.mock("sonner", () => ({ toast: { success: toastSuccessMock } }));

import { ProfileCard } from "@/components/settings/ProfileCard";

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
  Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

async function render(displayName: string | null) {
  await act(async () => {
    root?.render(
      <ProfileCard displayName={displayName} fallbackName="kayodante" />,
    );
  });
  return {
    input: container!.querySelector("input") as HTMLInputElement,
    button: container!.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement,
    avatar: container!.querySelector('[aria-hidden="true"]') as HTMLElement,
  };
}

describe("ProfileCard", () => {
  it("rotula o campo e mostra as iniciais do nome salvo", async () => {
    const { input, avatar } = await render("Kayo Dante");

    const label = container!.querySelector(`label[for="${input.id}"]`);
    expect(label?.textContent).toBe("Como quer ser chamado");
    expect(input.value).toBe("Kayo Dante");
    expect(avatar.textContent).toBe("KD");
  });

  it("sem nome salvo, o avatar usa o fallback e o salvar fica desabilitado", async () => {
    const { input, button, avatar } = await render(null);

    expect(input.value).toBe("");
    expect(avatar.textContent).toBe("K");
    expect(button.disabled).toBe(true);
  });

  it("atualiza o avatar enquanto digita e salva pelo action", async () => {
    setDisplayNameMock.mockResolvedValue({ ok: true, data: "Maria Silva" });
    const { input, button, avatar } = await render(null);

    await act(async () => setInputValue(input, "Maria Silva"));
    expect(avatar.textContent).toBe("MS");
    expect(button.disabled).toBe(false);

    await act(async () => {
      container!.querySelector("form")!.requestSubmit();
    });

    expect(setDisplayNameMock).toHaveBeenCalledWith("Maria Silva");
    expect(toastSuccessMock).toHaveBeenCalledWith("Nome salvo.");
  });

  it("mostra o erro do servidor ligado ao campo", async () => {
    setDisplayNameMock.mockResolvedValue({
      ok: false,
      code: "UNKNOWN",
      message: "Não foi possível salvar seu nome.",
    });
    const { input } = await render(null);

    await act(async () => setInputValue(input, "Kayo"));
    await act(async () => {
      container!.querySelector("form")!.requestSubmit();
    });

    const alert = container!.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toBe("Não foi possível salvar seu nome.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toContain(alert.id);
    expect(toastSuccessMock).not.toHaveBeenCalled();
  });
});
