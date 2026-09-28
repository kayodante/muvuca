import { beforeEach, describe, expect, it, vi } from "vitest";

import { ptBR } from "@/lib/i18n/dictionaries/pt-BR";
import { en } from "@/lib/i18n/dictionaries/en";

const {
  requireUserMock,
  createClientMock,
  upsertMock,
  fromMock,
  revalidatePathMock,
  logEventMock,
  getDictionaryMock,
  processAvatarMock,
  putAvatarObjectMock,
  removeAvatarObjectsMock,
} = vi.hoisted(() => {
  const upsertMock = vi.fn();
  const fromMock = vi.fn(() => ({ upsert: upsertMock }));
  return {
    requireUserMock: vi.fn(),
    createClientMock: vi.fn(),
    upsertMock,
    fromMock,
    revalidatePathMock: vi.fn(),
    logEventMock: vi.fn(),
    getDictionaryMock: vi.fn(),
    processAvatarMock: vi.fn(),
    putAvatarObjectMock: vi.fn(),
    removeAvatarObjectsMock: vi.fn(),
  };
});

vi.mock("@/lib/auth/require-user", () => ({ requireUser: requireUserMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/security/logging", () => ({ logEvent: logEventMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/i18n/server", () => ({ getDictionary: getDictionaryMock }));
vi.mock("@/lib/metadata/image", () => ({ processAvatar: processAvatarMock }));
vi.mock("@/lib/storage/avatars", () => ({
  avatarObjectKey: (userId: string, hash: string) => `${userId}/${hash}.webp`,
  putAvatarObject: putAvatarObjectMock,
  removeAvatarObjects: removeAvatarObjectsMock,
}));

import { removeAvatar, setAvatar, setDisplayName } from "./profile";

describe("setDisplayName (lib/actions/profile.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({ id: "usr-42" });
    createClientMock.mockResolvedValue({ from: fromMock });
    upsertMock.mockResolvedValue({ error: null });
    getDictionaryMock.mockResolvedValue(ptBR);
  });

  it("rejeita nome longo demais sem autenticar nem tocar no banco", async () => {
    const result = await setDisplayName("a".repeat(51));

    expect(result).toMatchObject({ ok: false, code: "VALIDATION_FAILED" });
    expect(requireUserMock).not.toHaveBeenCalled();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("rejeita payload que não é string", async () => {
    expect(await setDisplayName({ user_id: "usr-other" })).toMatchObject({
      ok: false,
      code: "VALIDATION_FAILED",
    });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("salva o nome aparado, com user_id da sessão, sem tocar no tema", async () => {
    const result = await setDisplayName("  Kayo  ");

    expect(result).toEqual({ ok: true, data: "Kayo" });
    expect(fromMock).toHaveBeenCalledWith("user_preferences");
    expect(upsertMock).toHaveBeenCalledWith(
      { user_id: "usr-42", display_name: "Kayo" },
      { onConflict: "user_id" },
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
  });

  it("vazio limpa o nome (null)", async () => {
    const result = await setDisplayName("   ");

    expect(result).toEqual({ ok: true, data: null });
    expect(upsertMock).toHaveBeenCalledWith(
      { user_id: "usr-42", display_name: null },
      { onConflict: "user_id" },
    );
  });

  it("falha do banco vira erro genérico, logado sem o nome", async () => {
    upsertMock.mockResolvedValue({
      error: { name: "PostgresError", message: "check violation" },
    });

    const result = await setDisplayName("Kayo");

    expect(result).toEqual({
      ok: false,
      code: "UNKNOWN",
      message: ptBR.errors.displayNameSaveFailed,
    });
    expect(logEventMock).toHaveBeenCalledWith({
      event: "preferences.display_name_update_failed",
      status: "failure",
      userId: "usr-42",
      errorClass: "PostgresError",
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("rejeita nome longo demais com a mensagem em inglês quando o dicionário é en", async () => {
    getDictionaryMock.mockResolvedValue(en);

    const result = await setDisplayName("a".repeat(51));

    expect(result).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      message: en.validation.displayNameTooLong,
    });
  });
});

// `avatar` field of a real multipart FormData decodes to a `File`, not a
// plain object -- jsdom's `File` (the test environment global) is used here
// exactly like Node's would be at runtime.
function avatarFile(bytes: number, name = "avatar.png"): File {
  return new File([new Uint8Array(bytes)], name, { type: "image/png" });
}

function formDataWithAvatar(file: File | null): FormData {
  const formData = new FormData();
  if (file) formData.set("avatar", file);
  return formData;
}

const PROCESSED = {
  bytes: Buffer.from("webp-bytes"),
  width: 256,
  height: 256,
  sha256: "b".repeat(64),
};

describe("setAvatar (lib/actions/profile.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({ id: "usr-42" });
    createClientMock.mockResolvedValue({ from: fromMock });
    upsertMock.mockResolvedValue({ error: null });
    getDictionaryMock.mockResolvedValue(ptBR);
    processAvatarMock.mockResolvedValue(PROCESSED);
    putAvatarObjectMock.mockResolvedValue(undefined);
    removeAvatarObjectsMock.mockResolvedValue(undefined);
  });

  it("exige sessão antes de tocar no arquivo, storage ou banco", async () => {
    requireUserMock.mockImplementation(() => {
      throw new Error("redirect to /login");
    });

    await expect(
      setAvatar(formDataWithAvatar(avatarFile(1000))),
    ).rejects.toThrow();

    expect(processAvatarMock).not.toHaveBeenCalled();
    expect(putAvatarObjectMock).not.toHaveBeenCalled();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("rejeita argumento que não é FormData", async () => {
    const result = await setAvatar({ avatar: avatarFile(1000) });

    expect(result).toMatchObject({
      ok: false,
      code: "VALIDATION_FAILED",
      message: ptBR.validation.avatarUnsupportedFormat,
    });
    expect(processAvatarMock).not.toHaveBeenCalled();
    expect(putAvatarObjectMock).not.toHaveBeenCalled();
    expect(logEventMock).toHaveBeenCalledWith({
      event: "profile.avatar_rejected",
      status: "failure",
      userId: "usr-42",
      errorClass: "invalid_file",
    });
  });

  it("rejeita FormData sem o campo avatar", async () => {
    const result = await setAvatar(formDataWithAvatar(null));

    expect(result).toMatchObject({
      ok: false,
      code: "VALIDATION_FAILED",
      message: ptBR.validation.avatarUnsupportedFormat,
    });
    expect(processAvatarMock).not.toHaveBeenCalled();
    expect(putAvatarObjectMock).not.toHaveBeenCalled();
  });

  it("rejeita arquivo vazio", async () => {
    const result = await setAvatar(formDataWithAvatar(avatarFile(0)));

    expect(result).toMatchObject({
      ok: false,
      code: "VALIDATION_FAILED",
      message: ptBR.validation.avatarUnsupportedFormat,
    });
    expect(processAvatarMock).not.toHaveBeenCalled();
    expect(putAvatarObjectMock).not.toHaveBeenCalled();
    expect(logEventMock).toHaveBeenCalledWith({
      event: "profile.avatar_rejected",
      status: "failure",
      userId: "usr-42",
      errorClass: "invalid_file",
    });
  });

  it("rejeita arquivo acima de 2 MB", async () => {
    const result = await setAvatar(
      formDataWithAvatar(avatarFile(2 * 1024 * 1024 + 1)),
    );

    expect(result).toMatchObject({
      ok: false,
      code: "VALIDATION_FAILED",
      message: ptBR.validation.avatarTooLarge,
    });
    expect(processAvatarMock).not.toHaveBeenCalled();
    expect(putAvatarObjectMock).not.toHaveBeenCalled();
    expect(logEventMock).toHaveBeenCalledWith({
      event: "profile.avatar_rejected",
      status: "failure",
      userId: "usr-42",
      errorClass: "too_large",
    });
  });

  it("processAvatar rejeitando vira VALIDATION_FAILED com mensagem de formato, sem upload", async () => {
    const { PreviewError } = await import("@/lib/metadata/errors");
    processAvatarMock.mockRejectedValue(
      new PreviewError("image_rejected", "unrecognized_image_format"),
    );

    const result = await setAvatar(formDataWithAvatar(avatarFile(1000)));

    expect(result).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      message: ptBR.validation.avatarUnsupportedFormat,
    });
    expect(putAvatarObjectMock).not.toHaveBeenCalled();
    expect(logEventMock).toHaveBeenCalledWith({
      event: "profile.avatar_rejected",
      status: "failure",
      userId: "usr-42",
      errorClass: "image_rejected",
    });
  });

  it("falha de upload vira UNKNOWN sem gravar o hash", async () => {
    putAvatarObjectMock.mockRejectedValue(new Error("storage down"));

    const result = await setAvatar(formDataWithAvatar(avatarFile(1000)));

    expect(result).toEqual({
      ok: false,
      code: "UNKNOWN",
      message: ptBR.errors.avatarSaveFailed,
    });
    expect(upsertMock).not.toHaveBeenCalled();
    expect(logEventMock).toHaveBeenCalledWith({
      event: "profile.avatar_update_failed",
      status: "failure",
      userId: "usr-42",
      errorClass: "Error",
    });
  });

  it("falha ao gravar o hash vira UNKNOWN; upload já aconteceu antes; limpeza não roda", async () => {
    upsertMock.mockResolvedValue({
      error: { name: "PostgresError", message: "nope" },
    });

    const result = await setAvatar(formDataWithAvatar(avatarFile(1000)));

    expect(result).toEqual({
      ok: false,
      code: "UNKNOWN",
      message: ptBR.errors.avatarSaveFailed,
    });
    expect(putAvatarObjectMock).toHaveBeenCalled();
    expect(putAvatarObjectMock.mock.invocationCallOrder[0]!).toBeLessThan(
      upsertMock.mock.invocationCallOrder[0]!,
    );
    expect(removeAvatarObjectsMock).not.toHaveBeenCalled();
    expect(logEventMock).toHaveBeenCalledWith({
      event: "profile.avatar_update_failed",
      status: "failure",
      userId: "usr-42",
      errorClass: "PostgresError",
    });
  });

  it("sucesso: put -> upsert -> cleanup, chave usa o user_id da sessão mesmo com user_id estranho no FormData", async () => {
    const formData = formDataWithAvatar(avatarFile(1000));
    formData.set("user_id", "usr-attacker");

    const result = await setAvatar(formData);

    expect(result).toEqual({ ok: true, data: PROCESSED.sha256 });
    expect(fromMock).toHaveBeenCalledWith("user_preferences");
    expect(upsertMock).toHaveBeenCalledWith(
      { user_id: "usr-42", avatar_hash: PROCESSED.sha256 },
      { onConflict: "user_id" },
    );
    expect(putAvatarObjectMock).toHaveBeenCalledWith(
      expect.anything(),
      `usr-42/${PROCESSED.sha256}.webp`,
      PROCESSED.bytes,
    );
    const putOrder = putAvatarObjectMock.mock.invocationCallOrder[0]!;
    const upsertOrder = upsertMock.mock.invocationCallOrder[0]!;
    const cleanupOrder = removeAvatarObjectsMock.mock.invocationCallOrder[0]!;
    expect(putOrder).toBeLessThan(upsertOrder);
    expect(upsertOrder).toBeLessThan(cleanupOrder);
    expect(removeAvatarObjectsMock).toHaveBeenCalledWith(
      expect.anything(),
      "usr-42",
      PROCESSED.sha256,
    );
    expect(logEventMock).toHaveBeenCalledWith({
      event: "profile.avatar_updated",
      status: "success",
      userId: "usr-42",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
  });

  it("falha da limpeza ainda retorna ok e loga profile.avatar_cleanup_failed", async () => {
    removeAvatarObjectsMock.mockRejectedValue(new Error("orphan cleanup nope"));

    const result = await setAvatar(formDataWithAvatar(avatarFile(1000)));

    expect(result).toEqual({ ok: true, data: PROCESSED.sha256 });
    expect(logEventMock).toHaveBeenCalledWith({
      event: "profile.avatar_cleanup_failed",
      status: "failure",
      userId: "usr-42",
      errorClass: "Error",
    });
  });

  it("nenhum logEvent recebe nome de arquivo ou tamanho", async () => {
    await setAvatar(formDataWithAvatar(avatarFile(1000, "secret-name.png")));

    for (const call of logEventMock.mock.calls) {
      const fields = call[0];
      expect(Object.keys(fields).sort()).toEqual(
        ["errorClass", "event", "status", "userId"]
          .filter((key) => key in fields)
          .sort(),
      );
      expect(JSON.stringify(fields)).not.toContain("secret-name");
      expect(JSON.stringify(fields)).not.toContain("1000");
    }
  });
});

describe("removeAvatar (lib/actions/profile.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({ id: "usr-42" });
    createClientMock.mockResolvedValue({ from: fromMock });
    upsertMock.mockResolvedValue({ error: null });
    getDictionaryMock.mockResolvedValue(ptBR);
    removeAvatarObjectsMock.mockResolvedValue(undefined);
  });

  it("sucesso: zera avatar_hash e limpa o prefixo inteiro (sem keepHash)", async () => {
    const result = await removeAvatar();

    expect(result).toEqual({ ok: true, data: null });
    expect(upsertMock).toHaveBeenCalledWith(
      { user_id: "usr-42", avatar_hash: null },
      { onConflict: "user_id" },
    );
    expect(removeAvatarObjectsMock).toHaveBeenCalledWith(
      expect.anything(),
      "usr-42",
    );
    expect(logEventMock).toHaveBeenCalledWith({
      event: "profile.avatar_removed",
      status: "success",
      userId: "usr-42",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
  });

  it("erro do upsert vira UNKNOWN sem rodar a limpeza", async () => {
    upsertMock.mockResolvedValue({
      error: { name: "PostgresError", message: "nope" },
    });

    const result = await removeAvatar();

    expect(result).toEqual({
      ok: false,
      code: "UNKNOWN",
      message: ptBR.errors.avatarRemoveFailed,
    });
    expect(removeAvatarObjectsMock).not.toHaveBeenCalled();
    expect(logEventMock).toHaveBeenCalledWith({
      event: "profile.avatar_remove_failed",
      status: "failure",
      userId: "usr-42",
      errorClass: "PostgresError",
    });
  });

  it("falha da limpeza ainda retorna ok e loga profile.avatar_cleanup_failed", async () => {
    removeAvatarObjectsMock.mockRejectedValue(new Error("nope"));

    const result = await removeAvatar();

    expect(result).toEqual({ ok: true, data: null });
    expect(logEventMock).toHaveBeenCalledWith({
      event: "profile.avatar_cleanup_failed",
      status: "failure",
      userId: "usr-42",
      errorClass: "Error",
    });
  });
});
