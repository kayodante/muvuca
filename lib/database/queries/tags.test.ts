import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, logEventMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  logEventMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/security/logging", () => ({ logEvent: logEventMock }));

import { getTagList, getTagsByIds } from "@/lib/database/queries/tags";

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

describe("getTagsByIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves to [] without touching the client when tagIds is empty", async () => {
    await expect(getTagsByIds([])).resolves.toEqual([]);

    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("deduplicates ids into a single query", async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const inFn = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ in: inFn });
    const from = vi.fn().mockReturnValue({ select });
    createClientMock.mockResolvedValue({ from });

    await getTagsByIds(["tag-a", "tag-b", "tag-a"]);

    expect(inFn).toHaveBeenCalledTimes(1);
    expect(inFn).toHaveBeenCalledWith("id", ["tag-a", "tag-b"]);
  });

  it("logs a structured failure event before throwing when the query errors", async () => {
    const order = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "42501", name: "PostgrestError", message: "denied" },
    });
    const inFn = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ in: inFn });
    const from = vi.fn().mockReturnValue({ select });
    createClientMock.mockResolvedValue({ from });

    await expect(getTagsByIds(["tag-a"])).rejects.toMatchObject({
      code: "42501",
    });

    expect(logEventMock).toHaveBeenCalledWith({
      event: "tags.list_by_ids_failed",
      status: "failure",
      errorClass: "42501",
    });
  });
});
