import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, logEventMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  logEventMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/security/logging", () => ({ logEvent: logEventMock }));

import { getThemePreference } from "@/lib/database/queries/preferences";

describe("getThemePreference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs a structured failure event before throwing when the query errors", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "PGRST301", name: "PostgrestError", message: "denied" },
    });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const from = vi.fn().mockReturnValue({ select });
    createClientMock.mockResolvedValue({ from });

    await expect(getThemePreference()).rejects.toMatchObject({
      code: "PGRST301",
    });

    expect(logEventMock).toHaveBeenCalledWith({
      event: "preferences.get_failed",
      status: "failure",
      errorClass: "PGRST301",
    });
  });

  it("does not log on success and falls back to the default theme", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const from = vi.fn().mockReturnValue({ select });
    createClientMock.mockResolvedValue({ from });

    await expect(getThemePreference()).resolves.toBe("system");

    expect(logEventMock).not.toHaveBeenCalled();
  });
});
