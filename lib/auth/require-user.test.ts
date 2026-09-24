import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, getClaimsMock, redirectMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getClaimsMock: vi.fn(),
  redirectMock: vi.fn().mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT: ${url}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

import {
  requireUser,
  getOptionalUser,
  hasFreshRecoveryEntry,
  hasRecoverySession,
} from "./require-user";

describe("hasFreshRecoveryEntry", () => {
  const now = 1_790_000_000;

  it("aceita uma entrada recovery recente", () => {
    expect(
      hasFreshRecoveryEntry([{ method: "recovery", timestamp: now - 60 }], now),
    ).toBe(true);
  });

  it("recusa recovery fora da janela de 15 minutos", () => {
    expect(
      hasFreshRecoveryEntry(
        [{ method: "recovery", timestamp: now - 15 * 60 - 1 }],
        now,
      ),
    ).toBe(false);
  });

  it("recusa sessão de login por senha", () => {
    expect(
      hasFreshRecoveryEntry([{ method: "password", timestamp: now }], now),
    ).toBe(false);
  });

  it("recusa formatos inesperados", () => {
    expect(hasFreshRecoveryEntry(undefined, now)).toBe(false);
    expect(hasFreshRecoveryEntry(["recovery"], now)).toBe(false);
    expect(hasFreshRecoveryEntry([{ method: "recovery" }], now)).toBe(false);
    expect(
      hasFreshRecoveryEntry([{ method: "recovery", timestamp: "1" }], now),
    ).toBe(false);
  });
});

describe("require-user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue({
      auth: {
        getClaims: getClaimsMock,
      },
    });
  });

  describe("getOptionalUser", () => {
    it("retorna null sem redirecionar quando getClaims devolve erro", async () => {
      getClaimsMock.mockResolvedValue({
        data: null,
        error: new Error("Invalid JWT"),
      });

      const user = await getOptionalUser();

      expect(user).toBeNull();
      expect(redirectMock).not.toHaveBeenCalled();
      expect(getClaimsMock).toHaveBeenCalledTimes(1);
    });

    it("retorna null sem redirecionar quando data.claims é ausente ou nulo", async () => {
      getClaimsMock.mockResolvedValue({
        data: { claims: null },
        error: null,
      });

      const user = await getOptionalUser();

      expect(user).toBeNull();
      expect(redirectMock).not.toHaveBeenCalled();
    });

    it("mapeia id, email e prefere full_name sobre name quando claims são válidas", async () => {
      getClaimsMock.mockResolvedValue({
        data: {
          claims: {
            sub: "usr-456",
            email: "alice@example.com",
            user_metadata: {
              full_name: "Alice Wonderland",
              name: "Alice",
            },
          },
        },
        error: null,
      });

      const user = await getOptionalUser();

      expect(user).toEqual({
        id: "usr-456",
        email: "alice@example.com",
        name: "Alice Wonderland",
      });
      expect(redirectMock).not.toHaveBeenCalled();
    });

    it("usa user_metadata.name como fallback quando full_name não é string", async () => {
      getClaimsMock.mockResolvedValue({
        data: {
          claims: {
            sub: "usr-789",
            email: "bob@example.com",
            user_metadata: {
              name: "Bob Builder",
            },
          },
        },
        error: null,
      });

      const user = await getOptionalUser();

      expect(user).toEqual({
        id: "usr-789",
        email: "bob@example.com",
        name: "Bob Builder",
      });
    });

    it("define name como null quando nem full_name nem name são strings", async () => {
      getClaimsMock.mockResolvedValue({
        data: {
          claims: {
            sub: "usr-000",
            email: "anon@example.com",
            user_metadata: {},
          },
        },
        error: null,
      });

      const user = await getOptionalUser();

      expect(user).toEqual({
        id: "usr-000",
        email: "anon@example.com",
        name: null,
      });
    });
  });

  describe("hasRecoverySession", () => {
    it("retorna false quando getClaims devolve erro", async () => {
      getClaimsMock.mockResolvedValue({
        data: null,
        error: new Error("Invalid JWT"),
      });

      await expect(hasRecoverySession()).resolves.toBe(false);
    });

    it("retorna true para sessão aberta agora pelo link de recuperação", async () => {
      getClaimsMock.mockResolvedValue({
        data: {
          claims: {
            sub: "usr-1",
            amr: [
              { method: "recovery", timestamp: Math.floor(Date.now() / 1000) },
            ],
          },
        },
        error: null,
      });

      await expect(hasRecoverySession()).resolves.toBe(true);
    });

    it("retorna false para sessão de login por senha", async () => {
      getClaimsMock.mockResolvedValue({
        data: {
          claims: {
            sub: "usr-1",
            amr: [
              { method: "password", timestamp: Math.floor(Date.now() / 1000) },
            ],
          },
        },
        error: null,
      });

      await expect(hasRecoverySession()).resolves.toBe(false);
    });
  });

  describe("requireUser", () => {
    it("redireciona para /login quando getClaims devolve erro", async () => {
      getClaimsMock.mockResolvedValue({
        data: null,
        error: { message: "Token expired" },
      });

      await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT: /login");
      expect(redirectMock).toHaveBeenCalledWith("/login");
    });

    it("redireciona para /login quando claims é falsy", async () => {
      getClaimsMock.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT: /login");
      expect(redirectMock).toHaveBeenCalledWith("/login");
    });

    it("retorna o SessionUser quando a sessão é autenticada", async () => {
      getClaimsMock.mockResolvedValue({
        data: {
          claims: {
            sub: "usr-123",
            email: "charlie@example.com",
            user_metadata: {
              full_name: "Charlie Brown",
            },
          },
        },
        error: null,
      });

      const user = await requireUser();

      expect(user).toEqual({
        id: "usr-123",
        email: "charlie@example.com",
        name: "Charlie Brown",
      });
      expect(redirectMock).not.toHaveBeenCalled();
    });
  });
});
