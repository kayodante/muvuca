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
  };
});

vi.mock("@/lib/auth/require-user", () => ({ requireUser: requireUserMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/security/logging", () => ({ logEvent: logEventMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/i18n/server", () => ({ getDictionary: getDictionaryMock }));

import { setDisplayName } from "./profile";

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
