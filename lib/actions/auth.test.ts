import { beforeEach, describe, expect, it, vi } from "vitest";

import { ptBR } from "@/lib/i18n/dictionaries/pt-BR";
import { en } from "@/lib/i18n/dictionaries/en";

const {
  createClientMock,
  signInWithPasswordMock,
  resetPasswordForEmailMock,
  updateUserMock,
  signOutMock,
  getDictionaryMock,
  hasRecoverySessionMock,
  redirectMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
  resetPasswordForEmailMock: vi.fn(),
  updateUserMock: vi.fn(),
  signOutMock: vi.fn(),
  getDictionaryMock: vi.fn(),
  hasRecoverySessionMock: vi.fn(),
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
vi.mock("@/lib/validation/env", () => ({
  getEnv: () => ({ NEXT_PUBLIC_APP_URL: "https://muvuca.example.com" }),
}));
vi.mock("@/lib/security/logging", () => ({ logEvent: vi.fn() }));
vi.mock("@/lib/i18n/server", () => ({ getDictionary: getDictionaryMock }));
vi.mock("@/lib/auth/require-user", () => ({
  hasRecoverySession: hasRecoverySessionMock,
}));

import {
  requestPasswordReset,
  signInWithPassword,
  updatePassword,
} from "@/lib/actions/auth";
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
      error: {
        name: "AuthApiError",
        code: "over_request_rate_limit",
        status: 429,
      },
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

describe("requestPasswordReset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPasswordForEmailMock.mockResolvedValue({ error: null });
    createClientMock.mockResolvedValue({
      auth: { resetPasswordForEmail: resetPasswordForEmailMock },
    });
    getDictionaryMock.mockResolvedValue(ptBR);
  });

  it("builds redirectTo from NEXT_PUBLIC_APP_URL with next=/reset-password", async () => {
    await requestPasswordReset(null, formData({ email: "user@example.com" }));

    expect(resetPasswordForEmailMock).toHaveBeenCalledWith("user@example.com", {
      redirectTo:
        "https://muvuca.example.com/auth/confirm?next=%2Freset-password",
    });
  });

  it("returns ok even when Supabase returns an error (anti-enumeration)", async () => {
    resetPasswordForEmailMock.mockResolvedValue({
      error: { name: "AuthApiError", code: "over_request_rate_limit" },
    });

    const result = await requestPasswordReset(
      null,
      formData({ email: "no-such-account@example.com" }),
    );

    expect(result).toEqual({ ok: true, data: null });
  });

  it("returns ok for a known, presumably-existing account too", async () => {
    const result = await requestPasswordReset(
      null,
      formData({ email: "user@example.com" }),
    );

    expect(result).toEqual({ ok: true, data: null });
  });

  it("logs a Supabase failure without leaking the email", async () => {
    resetPasswordForEmailMock.mockResolvedValue({
      error: { name: "AuthApiError", code: "over_request_rate_limit" },
    });

    await requestPasswordReset(null, formData({ email: "user@example.com" }));

    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "auth.password_reset_request_failed",
        status: "failure",
        errorClass: "AuthApiError",
      }),
    );
    const loggedCall = vi.mocked(logEvent).mock.calls[0]?.[0];
    expect(JSON.stringify(loggedCall)).not.toContain("user@example.com");
  });

  it("does not call Supabase when validation fails", async () => {
    const result = await requestPasswordReset(
      null,
      formData({ email: "not-an-email" }),
    );

    expect(result).toMatchObject({
      ok: false,
      code: "VALIDATION_FAILED",
      message: ptBR.errors.invalidEmail,
    });
    expect(resetPasswordForEmailMock).not.toHaveBeenCalled();
  });
});

describe("updatePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasRecoverySessionMock.mockResolvedValue(true);
    updateUserMock.mockResolvedValue({ error: null });
    signOutMock.mockResolvedValue({ error: null });
    createClientMock.mockResolvedValue({
      auth: { updateUser: updateUserMock, signOut: signOutMock },
    });
    getDictionaryMock.mockResolvedValue(ptBR);
  });

  it("refuses a non-recovery session without calling updateUser", async () => {
    hasRecoverySessionMock.mockResolvedValue(false);

    const result = await updatePassword(
      null,
      formData({
        password: "long-enough-password",
        confirmPassword: "long-enough-password",
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      code: "FORBIDDEN",
      message: ptBR.errors.recoverySessionExpired,
    });
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("returns a field error on confirmPassword when passwords don't match", async () => {
    const result = await updatePassword(
      null,
      formData({
        password: "long-enough-password",
        confirmPassword: "does-not-match-password",
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      code: "VALIDATION_FAILED",
      fieldErrors: { confirmPassword: [ptBR.validation.passwordMismatch] },
    });
    expect(hasRecoverySessionMock).not.toHaveBeenCalled();
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("maps same_password to its specific message", async () => {
    updateUserMock.mockResolvedValue({
      error: { name: "AuthApiError", code: "same_password" },
    });

    const result = await updatePassword(
      null,
      formData({
        password: "long-enough-password",
        confirmPassword: "long-enough-password",
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      message: ptBR.errors.passwordSameAsCurrent,
    });
  });

  it("maps weak_password to the policy message", async () => {
    updateUserMock.mockResolvedValue({
      error: { name: "AuthApiError", code: "weak_password" },
    });

    const result = await updatePassword(
      null,
      formData({
        password: "long-enough-password",
        confirmPassword: "long-enough-password",
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      message: ptBR.errors.weakPassword,
    });
  });

  it("maps any other Supabase error to the generic message", async () => {
    updateUserMock.mockResolvedValue({
      error: { name: "AuthApiError", code: "something_else" },
    });

    const result = await updatePassword(
      null,
      formData({
        password: "long-enough-password",
        confirmPassword: "long-enough-password",
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      message: ptBR.errors.unknown,
    });
  });

  it("signs out other sessions then redirects on success", async () => {
    await expect(
      updatePassword(
        null,
        formData({
          password: "long-enough-password",
          confirmPassword: "long-enough-password",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/library");

    expect(updateUserMock).toHaveBeenCalledWith({
      password: "long-enough-password",
    });
    expect(signOutMock).toHaveBeenCalledWith({ scope: "others" });
  });

  it("still redirects even when signing out other sessions fails", async () => {
    signOutMock.mockResolvedValue({
      error: { name: "AuthApiError" },
    });

    await expect(
      updatePassword(
        null,
        formData({
          password: "long-enough-password",
          confirmPassword: "long-enough-password",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/library");

    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "auth.password_update_signout_others_failed",
        status: "failure",
      }),
    );
  });
});
