import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, logEventMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  logEventMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/security/logging", () => ({ logEvent: logEventMock }));

import { getUserPreferences } from "@/lib/database/queries/preferences";

describe("getUserPreferences", () => {
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

    await expect(getUserPreferences()).rejects.toMatchObject({
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

    await expect(getUserPreferences()).resolves.toEqual({
      theme: "system",
      displayName: null,
    });

    expect(logEventMock).not.toHaveBeenCalled();
  });

  it("returns the saved display name alongside the theme", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { theme: "dark", display_name: "Kayo" },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const from = vi.fn().mockReturnValue({ select });
    createClientMock.mockResolvedValue({ from });

    await expect(getUserPreferences()).resolves.toEqual({
      theme: "dark",
      displayName: "Kayo",
    });
    expect(select).toHaveBeenCalledWith("theme, display_name");
  });
});
