import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireUserMock,
  createClientMock,
  enrichOneMock,
  logEventMock,
  putPreviewObjectMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  createClientMock: vi.fn(),
  enrichOneMock: vi.fn(),
  logEventMock: vi.fn(),
  putPreviewObjectMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: requireUserMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/metadata/enrich", () => ({ enrichOne: enrichOneMock }));
vi.mock("@/lib/security/logging", () => ({ logEvent: logEventMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/storage/previews", () => ({
  PREVIEW_BUCKET: "link-previews",
  previewObjectKey: (
    userId: string,
    itemId: string,
    kind: "thumb" | "icon",
    hash: string,
  ) => `${userId}/${itemId}/${kind === "thumb" ? "t" : "i"}_${hash}.webp`,
  putPreviewObject: putPreviewObjectMock,
}));

import {
  drainPreviewQueue,
  refreshItemPreview,
  reschedulePreviewsForItems,
} from "./previews";
import { PREVIEW_ERROR_CODES } from "@/lib/metadata/errors";
import { PREVIEW_SCOPE_MAX_IDS } from "@/lib/validation/item";

const USER = { id: "11111111-1111-4111-8111-111111111111" };
const VALID_ITEM_ID = "123e4567-e89b-12d3-a456-426614174000";

function job(id: string) {
  return { item_id: id, url: `https://example.com/${id}`, attempts: 0 };
}

/** Builds a fake authenticated Supabase server client covering every call site `previews.ts` makes. */
function buildSupabase(
  rpc: ReturnType<typeof vi.fn>,
  remove: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue({ error: null }),
) {
  return {
    rpc,
    storage: { from: vi.fn().mockReturnValue({ remove }) },
  };
}

/** Wraps an rpc mock so `count_claimable_preview_jobs` (the `remaining` count) resolves to `remainingCount` -- other RPC names fall through to `impl`. */
function withRemainingCount(
  impl: (name: string) => Promise<{ data: unknown; error: unknown }>,
  remainingCount = 0,
) {
  return vi.fn().mockImplementation((name: string) => {
    if (name === "count_claimable_preview_jobs") {
      return Promise.resolve({ data: remainingCount, error: null });
    }
    return impl(name);
  });
}

function completeJobRpc() {
  return withRemainingCount((name: string) => {
    if (name === "claim_preview_jobs") {
      return Promise.resolve({ data: [], error: null });
    }
    if (name === "complete_preview_job") {
      return Promise.resolve({
        data: [{ previous_thumbnail_hash: null, previous_favicon_hash: null }],
        error: null,
      });
    }
    return Promise.resolve({ data: null, error: null });
  });
}

describe("drainPreviewQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue(USER);
    // mockClear() (via clearAllMocks) doesn't reset implementations, only
    // recorded calls -- default to success so a test that doesn't care
    // about uploads isn't accidentally poisoned by an earlier test's
    // mockRejectedValue.
    putPreviewObjectMock.mockResolvedValue(undefined);
  });

  it("never asks claim_preview_jobs for more than 6 jobs, even if opts.limit is larger", async () => {
    const rpc = completeJobRpc();
    createClientMock.mockResolvedValue(buildSupabase(rpc));

    await drainPreviewQueue({ limit: 999 });

    expect(rpc).toHaveBeenCalledWith("claim_preview_jobs", {
      p_limit: 6,
      p_item_ids: null,
    });
  });

  it("sends p_item_ids: null to both claim_preview_jobs and count_claimable_preview_jobs when itemIds is absent (preserves the global sweep for an older client bundle)", async () => {
    const rpc = completeJobRpc();
    createClientMock.mockResolvedValue(buildSupabase(rpc));

    await drainPreviewQueue({});

    expect(rpc).toHaveBeenCalledWith("claim_preview_jobs", {
      p_limit: 6,
      p_item_ids: null,
    });
    expect(rpc).toHaveBeenCalledWith("count_claimable_preview_jobs", {
      p_item_ids: null,
    });
  });

  it("passes the given itemIds as p_item_ids to both claim_preview_jobs and count_claimable_preview_jobs", async () => {
    const rpc = completeJobRpc();
    createClientMock.mockResolvedValue(buildSupabase(rpc));

    await drainPreviewQueue({ itemIds: [VALID_ITEM_ID] });

    expect(rpc).toHaveBeenCalledWith("claim_preview_jobs", {
      p_limit: 6,
      p_item_ids: [VALID_ITEM_ID],
    });
    expect(rpc).toHaveBeenCalledWith("count_claimable_preview_jobs", {
      p_item_ids: [VALID_ITEM_ID],
    });
  });

  it("rejects a scope longer than PREVIEW_SCOPE_MAX_IDS without calling the database", async () => {
    const rpc = vi.fn();
    createClientMock.mockResolvedValue(buildSupabase(rpc));
    const tooMany = Array.from(
      { length: PREVIEW_SCOPE_MAX_IDS + 1 },
      () => VALID_ITEM_ID,
    );

    const result = await drainPreviewQueue({ itemIds: tooMany });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("VALIDATION_FAILED");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a non-uuid item id in the scope without calling the database", async () => {
    const rpc = vi.fn();
    createClientMock.mockResolvedValue(buildSupabase(rpc));

    const result = await drainPreviewQueue({ itemIds: ["not-a-uuid"] });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("VALIDATION_FAILED");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("processes claimed jobs with concurrency capped at 3, never sequential and never unbounded", async () => {
    const jobs = [job("a"), job("b"), job("c"), job("d"), job("e"), job("f")];
    const rpc = vi.fn().mockImplementation((name: string) => {
      if (name === "claim_preview_jobs")
        return Promise.resolve({ data: jobs, error: null });
      if (name === "complete_preview_job") {
        return Promise.resolve({
          data: [
            { previous_thumbnail_hash: null, previous_favicon_hash: null },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });
    createClientMock.mockResolvedValue(buildSupabase(rpc));

    let active = 0;
    let maxActive = 0;
    enrichOneMock.mockImplementation(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 15));
      active--;
      return { status: "failed", errorCode: "timeout" };
    });

    const result = await drainPreviewQueue({ limit: 6 });

    expect(enrichOneMock).toHaveBeenCalledTimes(6);
    expect(maxActive).toBeLessThanOrEqual(3);
    expect(maxActive).toBeGreaterThan(1); // proves it isn't fully sequential
    expect(result).toEqual({
      ok: true,
      data: { processed: 6, ready: 0, failed: 6, remaining: 0 },
    });
  });

  it("still processes every other job in the batch when one enrichOne call throws unexpectedly", async () => {
    const jobs = [job("broken"), job("fine")];
    const rpc = completeJobRpc();
    rpc.mockImplementation((name: string) => {
      if (name === "claim_preview_jobs")
        return Promise.resolve({ data: jobs, error: null });
      if (name === "complete_preview_job") {
        return Promise.resolve({
          data: [
            { previous_thumbnail_hash: null, previous_favicon_hash: null },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });
    createClientMock.mockResolvedValue(buildSupabase(rpc));

    enrichOneMock.mockImplementation(async (input: { itemId: string }) => {
      if (input.itemId === "broken") {
        throw new Error("enrichOne contract violated in this test");
      }
      return {
        status: "ready",
        title: null,
        description: null,
        siteName: null,
        thumbnail: null,
        thumbnailSource: "none",
        favicon: null,
      };
    });

    const result = await drainPreviewQueue({});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.processed).toBe(2);
      expect(result.data.ready).toBe(1);
      expect(result.data.failed).toBe(1);
    }
  });

  // An unexpected exception must still reach
  // complete_preview_job -- attempts incremented, backoff applied --
  // instead of leaving the job's status stuck at 'pending' with the lease
  // simply expiring, which would let it be reclaimed and retried forever.
  it("persists a failed state transition (attempts/backoff) when enrichOne throws unexpectedly, instead of leaving the job stuck pending", async () => {
    const jobs = [job("broken")];
    const rpc = completeJobRpc();
    rpc.mockImplementation((name: string) => {
      if (name === "claim_preview_jobs")
        return Promise.resolve({ data: jobs, error: null });
      if (name === "complete_preview_job") {
        return Promise.resolve({
          data: [
            { previous_thumbnail_hash: null, previous_favicon_hash: null },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });
    createClientMock.mockResolvedValue(buildSupabase(rpc));

    enrichOneMock.mockImplementation(async () => {
      throw new Error("enrichOne contract violated in this test");
    });

    const result = await drainPreviewQueue({});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.processed).toBe(1);
      expect(result.data.failed).toBe(1);
    }
    expect(rpc).toHaveBeenCalledWith("complete_preview_job", {
      p_item_id: "broken",
      p_status: "failed",
      p_error_code: "unknown",
    });
  });

  it("uploads the new thumbnail/favicon and best-effort removes the previous hash's objects when they changed", async () => {
    const jobs = [job("rehashed")];
    const remove = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockImplementation((name: string) => {
      if (name === "claim_preview_jobs") {
        return Promise.resolve({ data: jobs, error: null });
      }
      if (name === "complete_preview_job") {
        return Promise.resolve({
          data: [
            {
              previous_thumbnail_hash: "b".repeat(64),
              previous_favicon_hash: "c".repeat(64),
            },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });
    createClientMock.mockResolvedValue(buildSupabase(rpc, remove));
    putPreviewObjectMock.mockResolvedValue(undefined);

    enrichOneMock.mockResolvedValue({
      status: "ready",
      title: "Title",
      description: null,
      siteName: null,
      thumbnail: {
        bytes: Buffer.from("t"),
        width: 640,
        height: 360,
        sha256: "a".repeat(64),
      },
      thumbnailSource: "og_image",
      favicon: {
        bytes: Buffer.from("i"),
        width: 64,
        height: 64,
        sha256: "d".repeat(64),
      },
    });

    const result = await drainPreviewQueue({});

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.ready).toBe(1);

    // New objects are uploaded under the new hash...
    expect(putPreviewObjectMock).toHaveBeenCalledTimes(2);
    // ...and the previous hash's objects (now orphaned) are removed.
    expect(remove).toHaveBeenCalledWith([
      `${USER.id}/rehashed/t_${"b".repeat(64)}.webp`,
    ]);
    expect(remove).toHaveBeenCalledWith([
      `${USER.id}/rehashed/i_${"c".repeat(64)}.webp`,
    ]);
  });

  it("marks the job failed with storage_failed (not ready) when the thumbnail upload fails", async () => {
    const jobs = [job("upload-fails")];
    const rpc = vi.fn().mockImplementation((name: string) => {
      if (name === "claim_preview_jobs") {
        return Promise.resolve({ data: jobs, error: null });
      }
      if (name === "complete_preview_job") {
        return Promise.resolve({
          data: [
            { previous_thumbnail_hash: null, previous_favicon_hash: null },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });
    createClientMock.mockResolvedValue(buildSupabase(rpc));
    putPreviewObjectMock.mockRejectedValue(new Error("storage down"));

    enrichOneMock.mockResolvedValue({
      status: "ready",
      title: "Title",
      description: null,
      siteName: null,
      thumbnail: {
        bytes: Buffer.from("t"),
        width: 640,
        height: 360,
        sha256: "e".repeat(64),
      },
      thumbnailSource: "og_image",
      favicon: null,
    });

    const result = await drainPreviewQueue({});

    expect(result).toEqual({
      ok: true,
      data: { processed: 1, ready: 0, failed: 1, remaining: 0 },
    });
    // The RPC must record the job as failed with storage_failed, never as
    // ready with a null hash (that would silently drop the thumbnail for
    // 30 days with no retry -- storage_failed is transient).
    expect(rpc).toHaveBeenCalledWith("complete_preview_job", {
      p_item_id: "upload-fails",
      p_status: "failed",
      p_error_code: "storage_failed",
    });
    expect(rpc).not.toHaveBeenCalledWith(
      "complete_preview_job",
      expect.objectContaining({ p_status: "ready" }),
    );
  });

  it("never logs a URL, and every logged preview.* errorClass is a known PreviewErrorCode", async () => {
    const jobs = [job("timeout-job")];
    const rpc = completeJobRpc();
    rpc.mockImplementation((name: string) => {
      if (name === "claim_preview_jobs")
        return Promise.resolve({ data: jobs, error: null });
      if (name === "complete_preview_job") {
        return Promise.resolve({
          data: [
            { previous_thumbnail_hash: null, previous_favicon_hash: null },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });
    createClientMock.mockResolvedValue(buildSupabase(rpc));
    enrichOneMock.mockResolvedValue({ status: "failed", errorCode: "timeout" });

    await drainPreviewQueue({});

    const loggedCalls = logEventMock.mock.calls.map(
      ([fields]) => fields as Record<string, unknown>,
    );
    expect(loggedCalls.length).toBeGreaterThan(0);

    for (const fields of loggedCalls) {
      const serialized = JSON.stringify(fields);
      expect(serialized).not.toMatch(/https?:\/\//);
      expect(serialized).not.toMatch(/example\.com/);

      const event = fields.event as string;
      const errorClass = fields.errorClass as string | undefined;
      const isPreviewOutcomeEvent =
        event === "preview.failed" ||
        event === "preview.blocked" ||
        event === "preview.image_rejected";
      if (isPreviewOutcomeEvent && errorClass) {
        expect(PREVIEW_ERROR_CODES).toContain(errorClass);
      }
    }
  });

  it("returns UNKNOWN when claim_preview_jobs itself errors, without throwing", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: null, error: { code: "XXXXX" } });
    createClientMock.mockResolvedValue(buildSupabase(rpc));

    const result = await drainPreviewQueue({});

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNKNOWN");
  });

  // `remaining` must track the same eligibility
  // rule as claim_preview_jobs (pending + overdue ready + transient-
  // exhausted failed), not just `status = 'pending'` -- otherwise overdue
  // `ready` rows past a single batch look abandoned. This simulates a
  // server-side queue of more overdue `ready` jobs than fit in one batch
  // (MAX_CLAIM_LIMIT = 6) and drives drainPreviewQueue across batches until
  // `remaining` reports 0, proving every job is eventually processed.
  it("drains overdue ready jobs across multiple batches until remaining (via count_claimable_preview_jobs) reaches 0", async () => {
    const queue = Array.from({ length: 8 }, (_, i) => job(`overdue-${i}`));

    const rpc = vi.fn().mockImplementation((name: string) => {
      if (name === "claim_preview_jobs") {
        const batch = queue.splice(0, 6);
        return Promise.resolve({ data: batch, error: null });
      }
      if (name === "complete_preview_job") {
        return Promise.resolve({
          data: [
            { previous_thumbnail_hash: null, previous_favicon_hash: null },
          ],
          error: null,
        });
      }
      if (name === "count_claimable_preview_jobs") {
        return Promise.resolve({ data: queue.length, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
    createClientMock.mockResolvedValue(buildSupabase(rpc));
    enrichOneMock.mockResolvedValue({
      status: "ready",
      title: null,
      description: null,
      siteName: null,
      thumbnail: null,
      thumbnailSource: "none",
      favicon: null,
    });

    const first = await drainPreviewQueue({});
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.data.processed).toBe(6);
      expect(first.data.remaining).toBe(2);
    }

    const second = await drainPreviewQueue({});
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.data.processed).toBe(2);
      expect(second.data.remaining).toBe(0);
    }

    expect(enrichOneMock).toHaveBeenCalledTimes(8);
  });

  // A count_claimable_preview_jobs RPC error must
  // never be silently coerced into `remaining: 0` -- that would tell
  // usePreviewDrain "queue empty" when the truth is "couldn't check", and
  // the drainer would stop looping while jobs are still eligible.
  it("does not treat a count_claimable_preview_jobs RPC error as an empty queue", async () => {
    const rpc = vi.fn().mockImplementation((name: string) => {
      if (name === "claim_preview_jobs") {
        return Promise.resolve({ data: [], error: null });
      }
      if (name === "count_claimable_preview_jobs") {
        return Promise.resolve({ data: null, error: { code: "XXXXX" } });
      }
      return Promise.resolve({ data: null, error: null });
    });
    createClientMock.mockResolvedValue(buildSupabase(rpc));

    const result = await drainPreviewQueue({});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.remaining).not.toBe(0);
      expect(result.data.remaining).toBeNull();
    }
    expect(logEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "preview.count_failed",
        status: "failure",
        errorClass: "XXXXX",
      }),
    );
  });
});

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
