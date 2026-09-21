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

import { requireUser, getOptionalUser } from "./require-user";

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
