import { beforeEach, describe, expect, it, vi } from "vitest";
import { ptBR } from "@/lib/i18n/dictionaries/pt-BR";

const {
  getOptionalUserMock,
  createClientMock,
  upsertMock,
  fromMock,
  revalidatePathMock,
  logEventMock,
  cookieSetMock,
  cookiesMock,
  getDictionaryMock,
} = vi.hoisted(() => {
  const upsertMock = vi.fn();
  const fromMock = vi.fn(() => ({ upsert: upsertMock }));
  const cookieSetMock = vi.fn();
  return {
    getOptionalUserMock: vi.fn(),
    createClientMock: vi.fn(),
    upsertMock,
    fromMock,
    revalidatePathMock: vi.fn(),
    logEventMock: vi.fn(),
    cookieSetMock,
    cookiesMock: vi.fn(() => ({ set: cookieSetMock })),
    getDictionaryMock: vi.fn(),
  };
});

vi.mock("@/lib/auth/require-user", () => ({
  getOptionalUser: getOptionalUserMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));
vi.mock("@/lib/security/logging", () => ({
  logEvent: logEventMock,
}));
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));
vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));
vi.mock("@/lib/i18n/server", () => ({
  getDictionary: getDictionaryMock,
}));

import { setLocale } from "./locale";

describe("setLocale (lib/actions/locale.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDictionaryMock.mockResolvedValue(ptBR);
    getOptionalUserMock.mockResolvedValue(null);
    createClientMock.mockResolvedValue({ from: fromMock });
    upsertMock.mockResolvedValue({ error: null });
  });

  describe("validação de schema", () => {
    it("rejeita locale inválido sem tocar cookie, sessão ou banco", async () => {
      const result = await setLocale("fr");

      expect(result).toEqual({
        ok: false,
        code: "VALIDATION_FAILED",
        message: ptBR.errors.invalidInput,
      });
      expect(cookieSetMock).not.toHaveBeenCalled();
      expect(getOptionalUserMock).not.toHaveBeenCalled();
      expect(createClientMock).not.toHaveBeenCalled();
      expect(revalidatePathMock).not.toHaveBeenCalled();
    });

    it("rejeita tipos inválidos (número, null, objeto)", async () => {
      for (const input of [123, null, {}]) {
        expect(await setLocale(input)).toEqual({
          ok: false,
          code: "VALIDATION_FAILED",
          message: ptBR.errors.invalidInput,
        });
      }
    });
  });

  describe("deslogado", () => {
    it("grava o cookie e não toca o banco", async () => {
      const result = await setLocale("en");

      expect(result).toEqual({ ok: true, data: "en" });
      expect(cookieSetMock).toHaveBeenCalledWith(
        "muvuca-locale",
        "en",
        expect.objectContaining({
          path: "/",
          sameSite: "lax",
          httpOnly: true,
          maxAge: 60 * 60 * 24 * 365,
        }),
      );
      expect(createClientMock).not.toHaveBeenCalled();
      expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
    });
  });

  describe("logado", () => {
    beforeEach(() => {
      getOptionalUserMock.mockResolvedValue({ id: "usr-42" });
    });

    it("grava o cookie e faz upsert com o id da sessão, nunca do input", async () => {
      const result = await setLocale("en");

      expect(result).toEqual({ ok: true, data: "en" });
      expect(cookieSetMock).toHaveBeenCalledWith(
        "muvuca-locale",
        "en",
        expect.objectContaining({ path: "/" }),
      );
      expect(fromMock).toHaveBeenCalledWith("user_preferences");
      expect(upsertMock).toHaveBeenCalledWith(
        { user_id: "usr-42", locale: "en" },
        { onConflict: "user_id" },
      );
      expect(logEventMock).toHaveBeenCalledWith({
        event: "preferences.locale_updated",
        status: "success",
        userId: "usr-42",
      });
      expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
    });

    it("retorna erro genérico e loga falha quando o upsert falha, mas o cookie já foi salvo", async () => {
      upsertMock.mockResolvedValue({
        error: { name: "PostgresError", message: "disk full" },
      });

      const result = await setLocale("pt-BR");

      expect(result).toEqual({
        ok: false,
        code: "UNKNOWN",
        message: ptBR.errors.unknown,
      });
      expect(cookieSetMock).toHaveBeenCalled();
      expect(logEventMock).toHaveBeenCalledWith({
        event: "preferences.locale_update_failed",
        status: "failure",
        userId: "usr-42",
        errorClass: "PostgresError",
      });
      expect(revalidatePathMock).not.toHaveBeenCalled();
    });
  });
});
