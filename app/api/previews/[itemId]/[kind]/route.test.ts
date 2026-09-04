import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const { getOptionalUserMock, createClientMock, maybeSingleMock, downloadMock } =
  vi.hoisted(() => ({
    getOptionalUserMock: vi.fn(),
    createClientMock: vi.fn(),
    maybeSingleMock: vi.fn(),
    downloadMock: vi.fn(),
  }));

vi.mock("@/lib/auth/require-user", () => ({
  getOptionalUser: getOptionalUserMock,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/storage/previews", () => ({
  PREVIEW_BUCKET: "link-previews",
  previewObjectKey: (
    userId: string,
    itemId: string,
    kind: "thumb" | "icon",
    hash: string,
  ) => `${userId}/${itemId}/${kind === "thumb" ? "t" : "i"}_${hash}.webp`,
}));

import { GET } from "./route";

const USER = { id: "11111111-1111-4111-8111-111111111111" };
const VALID_ITEM_ID = "123e4567-e89b-12d3-a456-426614174000";

function buildSupabase() {
  const eq = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return {
    from,
    storage: { from: vi.fn().mockReturnValue({ download: downloadMock }) },
  };
}

function request(path: string) {
  return new Request(`https://muvuca.example.com${path}`) as NextRequest;
}

function params(itemId: string, kind: string) {
  return { params: Promise.resolve({ itemId, kind }) };
}

describe("GET /api/previews/[itemId]/[kind]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOptionalUserMock.mockResolvedValue(USER);
    createClientMock.mockResolvedValue(buildSupabase());
  });

  it("returns 400 when itemId is not a UUID", async () => {
    const response = await GET(
      request(`/api/previews/not-a-uuid/thumb?v=abc`),
      params("not-a-uuid", "thumb"),
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when kind is neither thumb nor icon", async () => {
    const response = await GET(
      request(`/api/previews/${VALID_ITEM_ID}/poster?v=abc`),
      params(VALID_ITEM_ID, "poster"),
    );

    expect(response.status).toBe(400);
  });

  it("returns 401 when there is no authenticated user", async () => {
    getOptionalUserMock.mockResolvedValue(null);

    const response = await GET(
      request(`/api/previews/${VALID_ITEM_ID}/thumb?v=abc`),
      params(VALID_ITEM_ID, "thumb"),
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when the item belongs to another user (zero rows under RLS)", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    const response = await GET(
      request(`/api/previews/${VALID_ITEM_ID}/thumb?v=abc`),
      params(VALID_ITEM_ID, "thumb"),
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 when ?v= does not match the persisted hash", async () => {
    maybeSingleMock.mockResolvedValue({
      data: { thumbnail_hash: "current-hash", favicon_hash: null },
      error: null,
    });

    const response = await GET(
      request(`/api/previews/${VALID_ITEM_ID}/thumb?v=stale-hash`),
      params(VALID_ITEM_ID, "thumb"),
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 when the stored hash for that kind is null", async () => {
    maybeSingleMock.mockResolvedValue({
      data: { thumbnail_hash: null, favicon_hash: null },
      error: null,
    });

    const response = await GET(
      request(`/api/previews/${VALID_ITEM_ID}/thumb?v=anything`),
      params(VALID_ITEM_ID, "thumb"),
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 when the Storage object is missing", async () => {
    maybeSingleMock.mockResolvedValue({
      data: { thumbnail_hash: "abc123", favicon_hash: null },
      error: null,
    });
    downloadMock.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });

    const response = await GET(
      request(`/api/previews/${VALID_ITEM_ID}/thumb?v=abc123`),
      params(VALID_ITEM_ID, "thumb"),
    );

    expect(response.status).toBe(404);
  });

  it("serves the WebP image with immutable, same-origin cache headers on success", async () => {
    maybeSingleMock.mockResolvedValue({
      data: { thumbnail_hash: "abc123", favicon_hash: null },
      error: null,
    });
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/webp" });
    downloadMock.mockResolvedValue({ data: blob, error: null });

    const response = await GET(
      request(`/api/previews/${VALID_ITEM_ID}/thumb?v=abc123`),
      params(VALID_ITEM_ID, "thumb"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("cache-control")).toContain("immutable");
    expect(downloadMock).toHaveBeenCalledWith(
      `${USER.id}/${VALID_ITEM_ID}/t_abc123.webp`,
    );
  });

  it("serves the favicon under the icon kind using favicon_hash", async () => {
    maybeSingleMock.mockResolvedValue({
      data: { thumbnail_hash: null, favicon_hash: "def456" },
      error: null,
    });
    const blob = new Blob([new Uint8Array([1])], { type: "image/webp" });
    downloadMock.mockResolvedValue({ data: blob, error: null });

    const response = await GET(
      request(`/api/previews/${VALID_ITEM_ID}/icon?v=def456`),
      params(VALID_ITEM_ID, "icon"),
    );

    expect(response.status).toBe(200);
    expect(downloadMock).toHaveBeenCalledWith(
      `${USER.id}/${VALID_ITEM_ID}/i_def456.webp`,
    );
  });
});
