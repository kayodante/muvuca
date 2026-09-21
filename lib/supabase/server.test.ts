import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type CookieOptions = Record<string, unknown>;
type CookieToSet = { name: string; value: string; options?: CookieOptions };

let capturedCookieHandlers: {
  getAll: () => unknown;
  setAll: (cookiesToSet: CookieToSet[]) => void;
} | null = null;

const { createServerClientMock, cookiesMock, cookieStoreMock } = vi.hoisted(
  () => {
    const cookieStoreMock = {
      getAll: vi.fn(),
      set: vi.fn(),
    };
    return {
      createServerClientMock: vi.fn(),
      cookiesMock: vi.fn(),
      cookieStoreMock,
    };
  },
);

vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

import { createClient } from "./server";

describe("createClient (lib/supabase/server.ts)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    capturedCookieHandlers = null;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";

    cookiesMock.mockResolvedValue(cookieStoreMock);
    createServerClientMock.mockImplementation(
      (
        _url: string,
        _key: string,
        options: { cookies: typeof capturedCookieHandlers },
      ) => {
        capturedCookieHandlers = options.cookies;
        return { fakeClient: true };
      },
    );
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("cria o client usando @supabase/ssr com as chaves do ambiente", async () => {
    const client = await createClient();

    expect(cookiesMock).toHaveBeenCalledTimes(1);
    expect(createServerClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "sb_publishable_test",
      expect.objectContaining({
        cookies: expect.any(Object),
      }),
    );
    expect(client).toEqual({ fakeClient: true });
  });

  it("delega getAll para cookieStore.getAll()", async () => {
    cookieStoreMock.getAll.mockReturnValue([
      { name: "sb-auth", value: "token" },
    ]);

    await createClient();
    expect(capturedCookieHandlers).not.toBeNull();

    const result = capturedCookieHandlers!.getAll();
    expect(cookieStoreMock.getAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ name: "sb-auth", value: "token" }]);
  });

  it("chama cookieStore.set para cada item em setAll", async () => {
    await createClient();
    expect(capturedCookieHandlers).not.toBeNull();

    capturedCookieHandlers!.setAll([
      { name: "cookie1", value: "val1", options: { httpOnly: true } },
      { name: "cookie2", value: "val2", options: { secure: true } },
    ]);

    expect(cookieStoreMock.set).toHaveBeenCalledTimes(2);
    expect(cookieStoreMock.set).toHaveBeenNthCalledWith(1, "cookie1", "val1", {
      httpOnly: true,
    });
    expect(cookieStoreMock.set).toHaveBeenNthCalledWith(2, "cookie2", "val2", {
      secure: true,
    });
  });

  it("silencia erro em setAll quando chamado em Server Component sem permissão de escrita", async () => {
    cookieStoreMock.set.mockImplementation(() => {
      throw new Error(
        "Cookies can only be modified in a Server Action or Route Handler",
      );
    });

    await createClient();
    expect(capturedCookieHandlers).not.toBeNull();

    expect(() => {
      capturedCookieHandlers!.setAll([
        { name: "read-only-cookie", value: "fail" },
      ]);
    }).not.toThrow();
  });
});
