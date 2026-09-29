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
      locale: null,
      avatarHash: null,
    });

    expect(logEventMock).not.toHaveBeenCalled();
  });

  it("returns the saved display name, locale and avatar hash alongside the theme", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        theme: "dark",
        display_name: "Kayo",
        locale: "en",
        avatar_hash: "a".repeat(64),
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const from = vi.fn().mockReturnValue({ select });
    createClientMock.mockResolvedValue({ from });

    await expect(getUserPreferences()).resolves.toEqual({
      theme: "dark",
      displayName: "Kayo",
      locale: "en",
      avatarHash: "a".repeat(64),
    });
    // select("*") temporarily until migration 0035 reaches production --
    // see the comment on getUserPreferences for why.
    expect(select).toHaveBeenCalledWith("*");
  });

  it("falls back to null for an invalid saved locale", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { theme: "dark", locale: "fr" },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const from = vi.fn().mockReturnValue({ select });
    createClientMock.mockResolvedValue({ from });

    await expect(getUserPreferences()).resolves.toEqual({
      theme: "dark",
      displayName: null,
      locale: null,
      avatarHash: null,
    });
  });

  it("falls back to null avatarHash when the column is missing (pre-migration deploy window)", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { theme: "dark", display_name: null, locale: "en" },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const from = vi.fn().mockReturnValue({ select });
    createClientMock.mockResolvedValue({ from });

    await expect(getUserPreferences()).resolves.toMatchObject({
      avatarHash: null,
    });
  });
});
