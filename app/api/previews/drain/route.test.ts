import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const { getOptionalUserMock, drainPreviewQueueMock } = vi.hoisted(() => ({
  getOptionalUserMock: vi.fn(),
  drainPreviewQueueMock: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({
  getOptionalUser: getOptionalUserMock,
}));
vi.mock("@/lib/previews/drain", () => ({
  drainPreviewQueue: drainPreviewQueueMock,
}));

import { POST } from "./route";

const USER = { id: "11111111-1111-4111-8111-111111111111" };
const VALID_ITEM_ID = "123e4567-e89b-12d3-a456-426614174000";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://muvuca.example.com/api/previews/drain", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as NextRequest;
}

function rawRequest(body: string, headers: Record<string, string> = {}) {
  return new Request("https://muvuca.example.com/api/previews/drain", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  }) as NextRequest;
}

describe("POST /api/previews/drain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOptionalUserMock.mockResolvedValue(USER);
    drainPreviewQueueMock.mockResolvedValue({
      ok: true,
      data: { processed: 0, ready: 0, failed: 0, remaining: 0 },
    });
  });

  it("returns 401 when there is no authenticated session", async () => {
    getOptionalUserMock.mockResolvedValue(null);

    const response = await POST(request({}));

    expect(response.status).toBe(401);
    expect(drainPreviewQueueMock).not.toHaveBeenCalled();
  });

  it("returns 400 when itemIds contains a non-uuid entry", async () => {
    const response = await POST(request({ itemIds: ["not-a-uuid"] }));

    expect(response.status).toBe(400);
    expect(drainPreviewQueueMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the body is not valid JSON", async () => {
    const response = await POST(rawRequest("not json"));

    expect(response.status).toBe(400);
    expect(drainPreviewQueueMock).not.toHaveBeenCalled();
  });

  it("returns 403 when sec-fetch-site is present and not same-origin", async () => {
    const response = await POST(
      request({}, { "sec-fetch-site": "cross-site" }),
    );

    expect(response.status).toBe(403);
    expect(drainPreviewQueueMock).not.toHaveBeenCalled();
  });

  it("allows a request with no sec-fetch-site header (non-browser or older client)", async () => {
    const response = await POST(request({}));

    expect(response.status).toBe(200);
  });

  it("allows a request with sec-fetch-site: same-origin", async () => {
    const response = await POST(
      request({}, { "sec-fetch-site": "same-origin" }),
    );

    expect(response.status).toBe(200);
  });

  it("passes the given itemIds through to drainPreviewQueue (scoped drain)", async () => {
    const response = await POST(request({ itemIds: [VALID_ITEM_ID] }));

    expect(response.status).toBe(200);
    expect(drainPreviewQueueMock).toHaveBeenCalledWith({
      itemIds: [VALID_ITEM_ID],
    });
  });

  it("calls drainPreviewQueue with no itemIds when the body omits it (global sweep)", async () => {
    const response = await POST(request({}));

    expect(response.status).toBe(200);
    expect(drainPreviewQueueMock).toHaveBeenCalledWith({});
    expect(drainPreviewQueueMock.mock.calls[0]?.[0]).not.toHaveProperty(
      "itemIds",
    );
  });

  it("returns the drainPreviewQueue result as JSON on success", async () => {
    drainPreviewQueueMock.mockResolvedValue({
      ok: true,
      data: { processed: 3, ready: 2, failed: 1, remaining: 5 },
    });

    const response = await POST(request({}));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: { processed: 3, ready: 2, failed: 1, remaining: 5 },
    });
  });

  it("still returns 200 (not 5xx) when drainPreviewQueue itself reports ok: false", async () => {
    drainPreviewQueueMock.mockResolvedValue({
      ok: false,
      code: "UNKNOWN",
      message: "Não foi possível buscar jobs de preview.",
    });

    const response = await POST(request({}));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(false);
  });
});
