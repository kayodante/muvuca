import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  findExistingBookmarkUrls,
  importBrowserBookmarks,
} from "@/lib/actions/bookmarks";

const mockRequireUser = vi.fn();
const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: () => mockRequireUser(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve(mockSupabase),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/security/logging", () => ({
  logEvent: vi.fn(),
}));

describe("bookmark actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue({ id: "user_123" });
  });

  it("finds existing URLs in chunks when many URLs are passed", async () => {
    const urls = Array.from(
      { length: 450 },
      (_, i) => `https://example.com/item/${i}`,
    );

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ normalized_url: "https://example.com/item/0" }],
            error: null,
          }),
        }),
      }),
    });

    const result = await findExistingBookmarkUrls(urls);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain("https://example.com/item/0");
    }
  });

  it("imports a batch of bookmarks successfully", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: [{ items_imported: 200, tags_created: 2, associations_created: 5 }],
      error: null,
    });

    const result = await importBrowserBookmarks({
      tags: [{ key: "tag_1", parentKey: null, name: "Folder" }],
      items: [
        {
          title: "Title",
          url: "https://example.com",
          normalizedUrl: "https://example.com/",
          tagKey: "tag_1",
        },
      ],
      invalidCount: 0,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.itemsImported).toBe(200);
      expect(result.data.tagsCreated).toBe(2);
      expect(result.data.associationsCreated).toBe(5);
    }
  });
});
