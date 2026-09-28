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
vi.mock("@/lib/storage/avatars", () => ({
  AVATAR_BUCKET: "avatars",
  avatarObjectKey: (userId: string, hash: string) => `${userId}/${hash}.webp`,
}));

import { GET } from "./route";

const USER = { id: "11111111-1111-4111-8111-111111111111" };

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

describe("GET /api/avatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOptionalUserMock.mockResolvedValue(USER);
    createClientMock.mockResolvedValue(buildSupabase());
  });

  it("returns 401 when there is no authenticated user, without touching Supabase", async () => {
    getOptionalUserMock.mockResolvedValue(null);

    const response = await GET(request(`/api/avatar?v=abc`));

    expect(response.status).toBe(401);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("returns 404 when ?v= is missing", async () => {
    const response = await GET(request(`/api/avatar`));

    expect(response.status).toBe(404);
  });

  it("returns 404 when ?v= does not match the persisted hash", async () => {
    maybeSingleMock.mockResolvedValue({
      data: { avatar_hash: "current-hash" },
      error: null,
    });

    const response = await GET(request(`/api/avatar?v=stale-hash`));

    expect(response.status).toBe(404);
  });

  it("returns 404 when there is no preferences row", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    const response = await GET(request(`/api/avatar?v=abc`));

    expect(response.status).toBe(404);
  });

  it("returns 404 when avatar_hash is null", async () => {
    maybeSingleMock.mockResolvedValue({
      data: { avatar_hash: null },
      error: null,
    });

    const response = await GET(request(`/api/avatar?v=abc`));

    expect(response.status).toBe(404);
  });

  it("returns 404 when the query errors", async () => {
    maybeSingleMock.mockResolvedValue({
      data: null,
      error: { message: "nope" },
    });

    const response = await GET(request(`/api/avatar?v=abc`));

    expect(response.status).toBe(404);
  });

  it("returns 404 when the Storage object is missing", async () => {
    maybeSingleMock.mockResolvedValue({
      data: { avatar_hash: "abc123" },
      error: null,
    });
    downloadMock.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });

    const response = await GET(request(`/api/avatar?v=abc123`));

    expect(response.status).toBe(404);
  });

  it("serves the WebP image with the fixed same-origin cache headers on success", async () => {
    maybeSingleMock.mockResolvedValue({
      data: { avatar_hash: "abc123" },
      error: null,
    });
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/webp" });
    downloadMock.mockResolvedValue({ data: blob, error: null });

    const response = await GET(request(`/api/avatar?v=abc123`));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("cache-control")).toBe(
      "private, max-age=31536000, immutable",
    );
    expect(response.headers.get("content-length")).toBe("3");
    expect(downloadMock).toHaveBeenCalledWith(`${USER.id}/abc123.webp`);
  });
});
