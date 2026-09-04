import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, signInWithOtpMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  signInWithOtpMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));
vi.mock("@/lib/validation/env", () => ({
  getEnv: () => ({ NEXT_PUBLIC_APP_URL: "https://muvuca.example.com" }),
}));
vi.mock("@/lib/security/logging", () => ({ logEvent: vi.fn() }));

import { signInWithMagicLink } from "@/lib/actions/auth";

describe("signInWithMagicLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInWithOtpMock.mockResolvedValue({ error: null });
    createClientMock.mockResolvedValue({
      auth: { signInWithOtp: signInWithOtpMock },
    });
  });

  it("requests the hosted PKCE callback at the canonical origin", async () => {
    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("next", "/tags");

    await signInWithMagicLink(null, formData);

    expect(signInWithOtpMock).toHaveBeenCalledWith({
      email: "user@example.com",
      options: {
        // Single-user deploy: the login form must never provision an
        // account. Asserted here, not just in auth.ts, so dropping the
        // flag fails the suite instead of silently reopening signup.
        shouldCreateUser: false,
        emailRedirectTo: "https://muvuca.example.com/auth/confirm?next=%2Ftags",
      },
    });
  });

  it("carries the validated next value through emailRedirectTo when provided", async () => {
    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("next", "/tags/abc");

    await signInWithMagicLink(null, formData);

    const call = signInWithOtpMock.mock.calls[0]?.[0];
    const redirectUrl = new URL(call.options.emailRedirectTo);
    expect(redirectUrl.searchParams.get("next")).toBe("/tags/abc");
  });

  it("falls back to the default redirect when next is absent", async () => {
    const formData = new FormData();
    formData.set("email", "user@example.com");

    await signInWithMagicLink(null, formData);

    const call = signInWithOtpMock.mock.calls[0]?.[0];
    const redirectUrl = new URL(call.options.emailRedirectTo);
    expect(redirectUrl.searchParams.get("next")).toBe("/library");
  });
});
