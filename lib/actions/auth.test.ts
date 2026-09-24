import { beforeEach, describe, expect, it, vi } from "vitest";

import { ptBR } from "@/lib/i18n/dictionaries/pt-BR";
import { en } from "@/lib/i18n/dictionaries/en";

const { createClientMock, signInWithPasswordMock, getDictionaryMock, redirectMock } =
  vi.hoisted(() => ({
    createClientMock: vi.fn(),
    signInWithPasswordMock: vi.fn(),
    getDictionaryMock: vi.fn(),
    redirectMock: vi.fn((url: string) => {
      // Mirrors next/navigation's real behavior: redirect() throws to
      // interrupt execution rather than returning.
      throw new Error(`NEXT_REDIRECT:${url}`);
    }),
  }));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));
vi.mock("@/lib/security/logging", () => ({ logEvent: vi.fn() }));
vi.mock("@/lib/i18n/server", () => ({ getDictionary: getDictionaryMock }));

import { signInWithPassword } from "@/lib/actions/auth";
import { logEvent } from "@/lib/security/logging";

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

describe("signInWithPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInWithPasswordMock.mockResolvedValue({ error: null });
    createClientMock.mockResolvedValue({
      auth: { signInWithPassword: signInWithPasswordMock },
    });
    getDictionaryMock.mockResolvedValue(ptBR);
  });

  it("calls Supabase with the submitted email and password", async () => {
    await expect(
      signInWithPassword(
        null,
        formData({ email: "user@example.com", password: "correct-horse" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "correct-horse",
    });
  });

  it("redirects to the validated next value when provided", async () => {
    await expect(
      signInWithPassword(
        null,
        formData({
          email: "user@example.com",
          password: "correct-horse",
          next: "/tags/abc",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/tags/abc");
  });

  it("redirects to /library when next is absent", async () => {
    await expect(
      signInWithPassword(
        null,
        formData({ email: "user@example.com", password: "correct-horse" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/library");
  });

  it.each(["https://evil.example", "//evil"])(
    "redirects to /library when next is malicious (%s)",
    async (maliciousNext) => {
      await expect(
        signInWithPassword(
          null,
          formData({
            email: "user@example.com",
            password: "correct-horse",
            next: maliciousNext,
          }),
        ),
      ).rejects.toThrow("NEXT_REDIRECT:/library");
    },
  );

  it("returns a generic error for invalid_credentials without calling redirect", async () => {
    signInWithPasswordMock.mockResolvedValue({
      error: { name: "AuthApiError", code: "invalid_credentials", status: 400 },
    });

    const result = await signInWithPassword(
      null,
      formData({ email: "user@example.com", password: "wrong" }),
    );

    expect(result).toMatchObject({
      ok: false,
      code: "INVALID_CREDENTIALS",
      message: ptBR.errors.invalidCredentials,
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("returns the identical generic error for an unrelated Supabase error", async () => {
    signInWithPasswordMock.mockResolvedValue({
      error: { name: "AuthApiError", code: "email_not_confirmed", status: 400 },
    });

    const result = await signInWithPassword(
      null,
      formData({ email: "user@example.com", password: "whatever" }),
    );

    expect(result).toMatchObject({
      ok: false,
      code: "INVALID_CREDENTIALS",
      message: ptBR.errors.invalidCredentials,
    });
  });

  it("returns a distinct generic message on a 429 without revealing account existence", async () => {
    signInWithPasswordMock.mockResolvedValue({
      error: { name: "AuthApiError", code: "over_request_rate_limit", status: 429 },
    });

    const result = await signInWithPassword(
      null,
      formData({ email: "user@example.com", password: "whatever" }),
    );

    expect(result).toMatchObject({
      ok: false,
      message: ptBR.errors.tooManyAttempts,
    });
  });

  it("does not call Supabase when validation fails", async () => {
    const result = await signInWithPassword(
      null,
      formData({ email: "not-an-email", password: "whatever" }),
    );

    expect(result).toMatchObject({
      ok: false,
      code: "VALIDATION_FAILED",
      message: ptBR.errors.invalidEmail,
    });
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });

  it("returns the English message when the dictionary is en", async () => {
    getDictionaryMock.mockResolvedValue(en);
    signInWithPasswordMock.mockResolvedValue({
      error: { name: "AuthApiError", code: "invalid_credentials", status: 400 },
    });

    const result = await signInWithPassword(
      null,
      formData({ email: "user@example.com", password: "wrong" }),
    );

    expect(result).toMatchObject({
      ok: false,
      message: en.errors.invalidCredentials,
    });
  });

  it("logs the failure without ever including the email or password", async () => {
    signInWithPasswordMock.mockResolvedValue({
      error: { name: "AuthApiError", code: "invalid_credentials", status: 400 },
    });

    await signInWithPassword(
      null,
      formData({ email: "user@example.com", password: "hunter2" }),
    );

    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "auth.password_sign_in_failed",
        status: "failure",
        errorClass: "AuthApiError",
      }),
    );
    const loggedCall = vi.mocked(logEvent).mock.calls[0]?.[0];
    expect(JSON.stringify(loggedCall)).not.toContain("user@example.com");
    expect(JSON.stringify(loggedCall)).not.toContain("hunter2");
  });
});
