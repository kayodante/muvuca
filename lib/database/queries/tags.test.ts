import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, logEventMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  logEventMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/security/logging", () => ({ logEvent: logEventMock }));

import { getTagList } from "@/lib/database/queries/tags";

describe("getTagList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs a structured failure event before throwing when the query errors", async () => {
    const order = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "42501", name: "PostgrestError", message: "denied" },
    });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });
    createClientMock.mockResolvedValue({ from });

    await expect(getTagList()).rejects.toMatchObject({ code: "42501" });

    expect(logEventMock).toHaveBeenCalledWith({
      event: "tags.list_failed",
      status: "failure",
      errorClass: "42501",
    });
  });

  it("does not log on success", async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });
    createClientMock.mockResolvedValue({ from });

    await expect(getTagList()).resolves.toEqual([]);

    expect(logEventMock).not.toHaveBeenCalled();
  });
});
