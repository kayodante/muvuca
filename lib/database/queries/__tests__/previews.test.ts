import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, inMock, fromMock, logEventMock } = vi.hoisted(() => {
  const inFn = vi.fn();
  const select = vi.fn().mockReturnValue({ in: inFn });
  const from = vi.fn().mockReturnValue({ select });
  return {
    inMock: inFn,
    fromMock: from,
    createClientMock: vi.fn().mockResolvedValue({ from }),
    logEventMock: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/security/logging", () => ({ logEvent: logEventMock }));

import { getPreviewsForItems } from "@/lib/database/queries/previews";

describe("getPreviewsForItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty map without querying when itemIds is empty", async () => {
    const result = await getPreviewsForItems([]);

    expect(result.size).toBe(0);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("queries link_previews filtered by item_id and maps snake_case to camelCase", async () => {
    inMock.mockResolvedValue({
      data: [
        {
          item_id: "item-1",
          status: "ready",
          thumbnail_hash: "abc123",
          thumbnail_width: 640,
          thumbnail_height: 360,
          favicon_hash: "def456",
          remote_description: "A great site",
          site_name: "Example",
        },
      ],
      error: null,
    });

    const result = await getPreviewsForItems(["item-1", "item-2"]);

    expect(fromMock).toHaveBeenCalledWith("link_previews");
    expect(inMock).toHaveBeenCalledWith("item_id", ["item-1", "item-2"]);
    expect(result.get("item-1")).toEqual({
      status: "ready",
      thumbnailHash: "abc123",
      thumbnailWidth: 640,
      thumbnailHeight: 360,
      faviconHash: "def456",
      remoteDescription: "A great site",
      siteName: "Example",
    });
  });

  it("leaves ids missing from the table as a missing map entry, not an error or null-valued entry", async () => {
    inMock.mockResolvedValue({ data: [], error: null });

    const result = await getPreviewsForItems(["item-1"]);

    expect(result.has("item-1")).toBe(false);
    expect(result.size).toBe(0);
  });

  it("degrades to an empty map and logs instead of throwing when the query errors", async () => {
    inMock.mockResolvedValue({
      data: null,
      error: { code: "500", message: "boom" },
    });

    const result = await getPreviewsForItems(["item-1"]);

    expect(result.size).toBe(0);
    expect(logEventMock).toHaveBeenCalledWith({
      event: "preview.list_failed",
      status: "failure",
      errorClass: "500",
    });
  });
});
