import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUserMock, createClientMock, logEventMock, revalidatePathMock } =
  vi.hoisted(() => ({
    requireUserMock: vi.fn(),
    createClientMock: vi.fn(),
    logEventMock: vi.fn(),
    revalidatePathMock: vi.fn(),
  }));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: requireUserMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/security/logging", () => ({ logEvent: logEventMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

import { refreshItemPreview, reschedulePreviewsForItems } from "./previews";
import { PREVIEW_SCOPE_MAX_IDS } from "@/lib/validation/item";

const USER = { id: "11111111-1111-4111-8111-111111111111" };
const VALID_ITEM_ID = "123e4567-e89b-12d3-a456-426614174000";

describe("refreshItemPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue(USER);
  });

  it("maps P0001 'preview não encontrado' to NOT_FOUND", async () => {
    const rpc = vi.fn().mockResolvedValue({
      error: { code: "P0001", message: "preview não encontrado" },
    });
    createClientMock.mockResolvedValue({ rpc });

    const result = await refreshItemPreview(VALID_ITEM_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("returns ok(null) on success and revalidates /library", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    createClientMock.mockResolvedValue({ rpc });

    const result = await refreshItemPreview(VALID_ITEM_ID);

    expect(result).toEqual({ ok: true, data: null });
    expect(rpc).toHaveBeenCalledWith("request_preview_refresh", {
      p_item_id: VALID_ITEM_ID,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/library");
  });

  it("does not revalidate when the RPC fails", async () => {
    const rpc = vi.fn().mockResolvedValue({
      error: { code: "P0001", message: "preview não encontrado" },
    });
    createClientMock.mockResolvedValue({ rpc });

    await refreshItemPreview(VALID_ITEM_ID);

    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid item id without calling the database", async () => {
    const rpc = vi.fn();
    createClientMock.mockResolvedValue({ rpc });

    const result = await refreshItemPreview("not-a-uuid");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("VALIDATION_FAILED");
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("reschedulePreviewsForItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue(USER);
  });

  it("returns the rescheduled count on success", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 3, error: null });
    createClientMock.mockResolvedValue({ rpc });

    const result = await reschedulePreviewsForItems([VALID_ITEM_ID]);

    expect(result).toEqual({ ok: true, data: { rescheduled: 3 } });
    expect(rpc).toHaveBeenCalledWith("request_preview_reschedule_for_items", {
      p_item_ids: [VALID_ITEM_ID],
    });
  });

  it("maps an RPC error to UNKNOWN without leaking detail", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: null, error: { code: "XXXXX" } });
    createClientMock.mockResolvedValue({ rpc });

    const result = await reschedulePreviewsForItems([VALID_ITEM_ID]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("UNKNOWN");
      expect(result.message).not.toMatch(/XXXXX/);
    }
    expect(logEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "preview.reschedule_failed",
        status: "failure",
        errorClass: "XXXXX",
      }),
    );
  });

  it("rejects a scope longer than PREVIEW_SCOPE_MAX_IDS without calling the database", async () => {
    const rpc = vi.fn();
    createClientMock.mockResolvedValue({ rpc });
    const tooMany = Array.from(
      { length: PREVIEW_SCOPE_MAX_IDS + 1 },
      () => VALID_ITEM_ID,
    );

    const result = await reschedulePreviewsForItems(tooMany);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("VALIDATION_FAILED");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a non-uuid item id without calling the database", async () => {
    const rpc = vi.fn();
    createClientMock.mockResolvedValue({ rpc });

    const result = await reschedulePreviewsForItems(["not-a-uuid"]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("VALIDATION_FAILED");
    expect(rpc).not.toHaveBeenCalled();
  });
});
