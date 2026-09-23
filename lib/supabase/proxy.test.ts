import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type CookieOptions = Record<string, unknown>;
type CookieToSet = { name: string; value: string; options?: CookieOptions };

let capturedCookieHandlers: {
  getAll: () => ReturnType<NextRequest["cookies"]["getAll"]>;
  setAll: (cookiesToSet: CookieToSet[]) => void;
} | null = null;

const { createServerClientMock, getClaimsMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  getClaimsMock: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}));

import { updateSession } from "./proxy";

describe("updateSession (lib/supabase/proxy.ts)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    capturedCookieHandlers = null;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";

    createServerClientMock.mockImplementation(
      (
        _url: string,
        _key: string,
        options: { cookies: typeof capturedCookieHandlers },
      ) => {
        capturedCookieHandlers = options.cookies;
        return {
          auth: {
            getClaims: getClaimsMock,
          },
        };
      },
    );
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("inicializa o client Supabase com as credenciais públicas do ambiente", async () => {
    getClaimsMock.mockResolvedValue({ data: { claims: { sub: "usr-1" } } });
    const req = new NextRequest("https://muvuca.example.com/");

    await updateSession(req);

    expect(createServerClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "sb_publishable_test",
      expect.objectContaining({
        cookies: expect.any(Object),
      }),
    );
  });

  it("adiciona x-nonce, CSP e Cache-Control na resposta padrão", async () => {
    getClaimsMock.mockResolvedValue({ data: { claims: { sub: "usr-1" } } });
    const req = new NextRequest("https://muvuca.example.com/");

    const res = await updateSession(req);

    const nonce = res.headers.get("x-nonce");
    expect(nonce).toBeDefined();
    expect(typeof nonce).toBe("string");
    expect(nonce!.length).toBeGreaterThan(0);

    const csp = res.headers.get("Content-Security-Policy");
    expect(csp).toContain(`'nonce-${nonce}'`);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("redireciona para /login quando usuário não autenticado tenta acessar rota protegida", async () => {
    getClaimsMock.mockResolvedValue({ data: null });
    const req = new NextRequest("https://muvuca.example.com/library");

    const res = await updateSession(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://muvuca.example.com/login",
    );
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(res.headers.get("Content-Security-Policy")).toBeDefined();
  });

  it("protege sub-rotas como /tags/[tagId] e /settings", async () => {
    getClaimsMock.mockResolvedValue({ data: { claims: null } });

    const tagReq = new NextRequest("https://muvuca.example.com/tags/abc-123");
    const tagRes = await updateSession(tagReq);
    expect(tagRes.status).toBe(307);
    expect(tagRes.headers.get("location")).toBe(
      "https://muvuca.example.com/login",
    );

    const settingsReq = new NextRequest("https://muvuca.example.com/settings");
    const settingsRes = await updateSession(settingsReq);
    expect(settingsRes.status).toBe(307);
    expect(settingsRes.headers.get("location")).toBe(
      "https://muvuca.example.com/login",
    );
  });

  it("protege as URLs amigáveis de tag (/t/...) sem capturar rotas vizinhas", async () => {
    getClaimsMock.mockResolvedValue({ data: { claims: null } });

    const tagRes = await updateSession(
      new NextRequest("https://muvuca.example.com/t/design/icones"),
    );
    expect(tagRes.status).toBe(307);
    expect(tagRes.headers.get("location")).toBe(
      "https://muvuca.example.com/login",
    );

    const neighbourRes = await updateSession(
      new NextRequest("https://muvuca.example.com/terms"),
    );
    expect(neighbourRes.status).toBe(200);
  });

  it("não redireciona rotas públicas quando não há sessão", async () => {
    getClaimsMock.mockResolvedValue({ data: null });

    const req = new NextRequest("https://muvuca.example.com/login");
    const res = await updateSession(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("não redireciona rotas protegidas quando há claims válidas", async () => {
    getClaimsMock.mockResolvedValue({
      data: { claims: { sub: "usr-123", email: "user@example.com" } },
    });

    const req = new NextRequest("https://muvuca.example.com/library");
    const res = await updateSession(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("sincroniza cookies via getAll e setAll", async () => {
    getClaimsMock.mockImplementation(async () => {
      // Simula o Supabase atualizando a sessão durante getClaims
      if (capturedCookieHandlers) {
        capturedCookieHandlers.setAll([
          {
            name: "sb-access-token",
            value: "token-123",
            options: { path: "/" },
          },
        ]);
      }
      return { data: { claims: { sub: "usr-123" } } };
    });

    const req = new NextRequest("https://muvuca.example.com/library", {
      headers: { cookie: "initial-cookie=value1" },
    });

    const res = await updateSession(req);

    expect(capturedCookieHandlers).not.toBeNull();
    const allCookies = capturedCookieHandlers!.getAll();
    expect(allCookies.some((c) => c.name === "initial-cookie")).toBe(true);

    const setCookieHeader = res.headers.get("set-cookie");
    expect(setCookieHeader).toContain("sb-access-token=token-123");
  });

  it("preserva cookies ao redirecionar para /login", async () => {
    getClaimsMock.mockImplementation(async () => {
      if (capturedCookieHandlers) {
        capturedCookieHandlers.setAll([
          {
            name: "sb-refresh-token",
            value: "expired-cleaned",
            options: { path: "/" },
          },
        ]);
      }
      return { data: null };
    });

    const req = new NextRequest("https://muvuca.example.com/settings");
    const res = await updateSession(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://muvuca.example.com/login",
    );
    const setCookieHeader = res.headers.get("set-cookie");
    expect(setCookieHeader).toContain("sb-refresh-token=expired-cleaned");
  });
});
