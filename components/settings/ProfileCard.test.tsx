import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  setDisplayNameMock,
  setAvatarMock,
  removeAvatarMock,
  toAvatarUploadMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  setDisplayNameMock: vi.fn(),
  setAvatarMock: vi.fn(),
  removeAvatarMock: vi.fn(),
  toAvatarUploadMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock("@/lib/actions/profile", () => ({
  setDisplayName: setDisplayNameMock,
  setAvatar: setAvatarMock,
  removeAvatar: removeAvatarMock,
}));
// jsdom has no createImageBitmap/canvas -- the crop/resize step is covered
// by the E2E spec (real Chromium), not here.
vi.mock("@/lib/profile/avatar-image", () => ({
  toAvatarUpload: toAvatarUploadMock,
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

function textInput(): HTMLInputElement {
  return Array.from(container!.querySelectorAll("input")).find(
    (el) => el.type !== "file",
  ) as HTMLInputElement;
}

function fileInput(): HTMLInputElement {
  return container!.querySelector('input[type="file"]') as HTMLInputElement;
}

function buttonNamed(name: string): HTMLButtonElement {
  return Array.from(container!.querySelectorAll("button")).find(
    (el) => el.textContent?.trim() === name,
  ) as HTMLButtonElement;
}

async function render(
  displayName: string | null,
  avatarHash: string | null = null,
) {
  await act(async () => {
    root?.render(
      <ProfileCard
        displayName={displayName}
        fallbackName="kayodante"
        avatarHash={avatarHash}
      />,
    );
  });
  return {
    input: textInput(),
    button: container!.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement,
    avatar: container!.querySelector('[aria-hidden="true"]') as HTMLElement,
  };
}

async function pickFile(file: File) {
  const input = fileInput();
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
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

  it("sem avatarHash mostra Enviar foto, sem Remover foto", async () => {
    await render(null, null);

    expect(buttonNamed("Enviar foto")).toBeTruthy();
    expect(buttonNamed("Alterar foto")).toBeFalsy();
    expect(buttonNamed("Remover foto")).toBeFalsy();
  });

  it("com avatarHash mostra Alterar foto e Remover foto", async () => {
    await render(null, "abc123");

    expect(buttonNamed("Alterar foto")).toBeTruthy();
    expect(buttonNamed("Remover foto")).toBeTruthy();
  });

  it("escolher um arquivo converte e envia via setAvatar, com toast de sucesso", async () => {
    const file = new File(["fake"], "foto.png", { type: "image/png" });
    const blob = new Blob(["fake"], { type: "image/webp" });
    toAvatarUploadMock.mockResolvedValue(blob);
    setAvatarMock.mockResolvedValue({ ok: true, data: "newhash" });
    await render(null, null);

    await pickFile(file);

    expect(toAvatarUploadMock).toHaveBeenCalledWith(file);
    const formData = setAvatarMock.mock.calls[0]?.[0] as FormData;
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get("avatar")).toBeTruthy();
    expect(toastSuccessMock).toHaveBeenCalledWith("Foto atualizada.");
  });

  it("toAvatarUpload rejeitado mostra erro de formato ligado ao botão, sem chamar setAvatar", async () => {
    const file = new File(["not an image"], "nao-e-imagem.png", {
      type: "image/png",
    });
    toAvatarUploadMock.mockRejectedValue(new Error("decode failed"));
    await render(null, null);

    await pickFile(file);

    const alert = container!.querySelector('[role="alert"]') as HTMLElement;
    expect(alert).toBeTruthy();
    expect(alert.textContent).toBe(
      "Formato não suportado. Use JPEG, PNG, WebP, GIF ou AVIF.",
    );
    const uploadButton = buttonNamed("Enviar foto");
    expect(uploadButton.getAttribute("aria-describedby")).toContain(alert.id);
    expect(setAvatarMock).not.toHaveBeenCalled();
  });

  it("setAvatar retornando erro mostra a mensagem, sem toast", async () => {
    const file = new File(["fake"], "foto.png", { type: "image/png" });
    toAvatarUploadMock.mockResolvedValue(new Blob(["fake"]));
    setAvatarMock.mockResolvedValue({
      ok: false,
      code: "UNKNOWN",
      message: "Não foi possível salvar sua foto.",
    });
    await render(null, null);

    await pickFile(file);

    const alert = container!.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toBe("Não foi possível salvar sua foto.");
    expect(toastSuccessMock).not.toHaveBeenCalled();
  });

  it("durante o envio o botão de foto fica pending e os controles ficam desabilitados", async () => {
    const file = new File(["fake"], "foto.png", { type: "image/png" });
    toAvatarUploadMock.mockResolvedValue(new Blob(["fake"]));
    let resolveSetAvatar: (value: { ok: true; data: string }) => void;
    setAvatarMock.mockReturnValue(
      new Promise((resolve) => {
        resolveSetAvatar = resolve;
      }),
    );
    await render(null, "abc123");

    await pickFile(file);

    const uploadButton = buttonNamed("Alterar foto");
    const removeButton = buttonNamed("Remover foto");
    expect(uploadButton.disabled).toBe(true);
    expect(removeButton.disabled).toBe(true);

    await act(async () => {
      resolveSetAvatar({ ok: true, data: "abc123" });
    });
  });

  it("remover a foto: sucesso mostra toast", async () => {
    removeAvatarMock.mockResolvedValue({ ok: true, data: null });
    await render(null, "abc123");

    await act(async () => {
      buttonNamed("Remover foto").click();
    });

    expect(removeAvatarMock).toHaveBeenCalled();
    expect(toastSuccessMock).toHaveBeenCalledWith("Foto removida.");
  });

  it("remover a foto: erro mostra a mensagem", async () => {
    removeAvatarMock.mockResolvedValue({
      ok: false,
      code: "UNKNOWN",
      message: "Não foi possível remover sua foto.",
    });
    await render(null, "abc123");

    await act(async () => {
      buttonNamed("Remover foto").click();
    });

    const alert = container!.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toBe("Não foi possível remover sua foto.");
    expect(toastSuccessMock).not.toHaveBeenCalled();
  });
});
