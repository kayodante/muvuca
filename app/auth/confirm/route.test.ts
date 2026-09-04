import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const { createClientMock, exchangeCodeForSessionMock, verifyOtpMock } =
  vi.hoisted(() => ({
    createClientMock: vi.fn(),
    exchangeCodeForSessionMock: vi.fn(),
    verifyOtpMock: vi.fn(),
  }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));
vi.mock("@/lib/validation/env", () => ({
  getEnv: () => ({ NEXT_PUBLIC_APP_URL: "https://muvuca.example.com" }),
}));
vi.mock("@/lib/security/logging", () => ({ logEvent: vi.fn() }));

import { GET } from "@/app/auth/confirm/route";

describe("GET /auth/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exchangeCodeForSessionMock.mockResolvedValue({ error: null });
    verifyOtpMock.mockResolvedValue({ error: null });
    createClientMock.mockResolvedValue({
      auth: {
        exchangeCodeForSession: exchangeCodeForSessionMock,
        verifyOtp: verifyOtpMock,
      },
    });
  });

  it("exchanges a hosted PKCE code and keeps the safe destination", async () => {
    const request = new Request(
      "https://muvuca.example.com/auth/confirm?code=auth-code&sb_flow_id=flow-1&next=/tags",
    ) as NextRequest;

    const response = await GET(request);

    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("auth-code", {
      flowId: "flow-1",
    });
    expect(response.headers.get("location")).toBe(
      "https://muvuca.example.com/tags",
    );
  });
});
