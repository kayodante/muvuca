import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireUserMock,
  createClientMock,
  upsertMock,
  fromMock,
  revalidatePathMock,
  logEventMock,
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
  };
});

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: requireUserMock,
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

import { setTheme } from "./theme";

describe("setTheme (lib/actions/theme.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({ id: "usr-42" });
    createClientMock.mockResolvedValue({
      from: fromMock,
    });
    upsertMock.mockResolvedValue({ error: null });
  });

  describe("validação de schema", () => {
    it("rejeita tema inválido sem chamar autenticação ou banco", async () => {
      const result = await setTheme("rainbow");

      expect(result).toEqual({
        ok: false,
        code: "VALIDATION_FAILED",
        message: "Tema inválido.",
      });
      expect(requireUserMock).not.toHaveBeenCalled();
      expect(createClientMock).not.toHaveBeenCalled();
      expect(revalidatePathMock).not.toHaveBeenCalled();
    });

    it("rejeita tipos inválidos (número, null, objeto)", async () => {
      expect(await setTheme(123)).toEqual({
        ok: false,
        code: "VALIDATION_FAILED",
        message: "Tema inválido.",
      });
      expect(await setTheme(null)).toEqual({
        ok: false,
        code: "VALIDATION_FAILED",
        message: "Tema inválido.",
      });
      expect(await setTheme({})).toEqual({
        ok: false,
        code: "VALIDATION_FAILED",
        message: "Tema inválido.",
      });
    });
  });

  describe("execução autorizada", () => {
    it("exige usuário autenticado", async () => {
      requireUserMock.mockRejectedValue(new Error("NEXT_REDIRECT: /login"));

      await expect(setTheme("dark")).rejects.toThrow("NEXT_REDIRECT: /login");
      expect(requireUserMock).toHaveBeenCalled();
      expect(createClientMock).not.toHaveBeenCalled();
    });

    it("persiste preferência com sucesso, revalida layout e loga evento", async () => {
      const result = await setTheme("dark");

      expect(result).toEqual({
        ok: true,
        data: "dark",
      });
      expect(fromMock).toHaveBeenCalledWith("user_preferences");
      expect(upsertMock).toHaveBeenCalledWith(
        { user_id: "usr-42", theme: "dark" },
        { onConflict: "user_id" },
      );
      expect(logEventMock).toHaveBeenCalledWith({
        event: "preferences.theme_updated",
        status: "success",
        userId: "usr-42",
      });
      expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
    });

    it("aceita os três temas válidos: light, dark e system", async () => {
      for (const theme of ["light", "dark", "system"] as const) {
        vi.clearAllMocks();
        const res = await setTheme(theme);
        expect(res).toEqual({ ok: true, data: theme });
        expect(upsertMock).toHaveBeenCalledWith(
          { user_id: "usr-42", theme },
          { onConflict: "user_id" },
        );
      }
    });

    it("retorna erro genérico e loga falha quando upsert no banco falha", async () => {
      upsertMock.mockResolvedValue({
        error: { name: "PostgresError", message: "disk full" },
      });

      const result = await setTheme("light");

      expect(result).toEqual({
        ok: false,
        code: "UNKNOWN",
        message: "Não foi possível atualizar a aparência.",
      });
      expect(logEventMock).toHaveBeenCalledWith({
        event: "preferences.theme_update_failed",
        status: "failure",
        userId: "usr-42",
        errorClass: "PostgresError",
      });
      expect(revalidatePathMock).not.toHaveBeenCalled();
    });
  });
});
