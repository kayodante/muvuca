import { describe, expect, it, vi } from "vitest";

import {
  deletePreviewObjects,
  previewObjectKey,
  putPreviewObject,
  removeAllUserPreviewObjects,
} from "./previews";

describe("previewObjectKey", () => {
  it("builds the thumbnail key", () => {
    expect(previewObjectKey("user-1", "item-1", "thumb", "abc")).toBe(
      "user-1/item-1/t_abc.webp",
    );
  });

  it("builds the favicon key", () => {
    expect(previewObjectKey("user-1", "item-1", "icon", "abc")).toBe(
      "user-1/item-1/i_abc.webp",
    );
  });
});

function fakeSupabase(overrides: {
  upload?: ReturnType<typeof vi.fn>;
  list?: ReturnType<typeof vi.fn>;
  remove?: ReturnType<typeof vi.fn>;
}) {
  return {
    storage: {
      from: vi.fn().mockReturnValue({
        upload: overrides.upload ?? vi.fn(),
        list: overrides.list ?? vi.fn(),
        remove: overrides.remove ?? vi.fn(),
      }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("putPreviewObject", () => {
  it("uploads with the webp content type", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const supabase = fakeSupabase({ upload });

    await putPreviewObject(
      supabase,
      "user-1/item-1/t_abc.webp",
      Buffer.from("x"),
    );

    expect(upload).toHaveBeenCalledWith(
      "user-1/item-1/t_abc.webp",
      Buffer.from("x"),
      { contentType: "image/webp", upsert: true },
    );
  });

  it("throws a storage_failed PreviewError when upload fails", async () => {
    const upload = vi.fn().mockResolvedValue({ error: { message: "nope" } });
    const supabase = fakeSupabase({ upload });

    await expect(
      putPreviewObject(supabase, "user-1/item-1/t_abc.webp", Buffer.from("x")),
    ).rejects.toMatchObject({ code: "storage_failed" });
  });
});

describe("deletePreviewObjects", () => {
  it("does nothing when there are no objects to delete", async () => {
    const list = vi.fn().mockResolvedValue({ data: [], error: null });
    const remove = vi.fn();
    const supabase = fakeSupabase({ list, remove });

    await deletePreviewObjects(supabase, "user-1", "item-1");

    expect(remove).not.toHaveBeenCalled();
  });

  it("removes every listed object under the item prefix", async () => {
    const list = vi.fn().mockResolvedValue({
      data: [{ name: "t_abc.webp" }, { name: "i_def.webp" }],
      error: null,
    });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const supabase = fakeSupabase({ list, remove });

    await deletePreviewObjects(supabase, "user-1", "item-1");

    expect(remove).toHaveBeenCalledWith([
      "user-1/item-1/t_abc.webp",
      "user-1/item-1/i_def.webp",
    ]);
  });

  it("throws a storage_failed PreviewError when list fails", async () => {
    const list = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "nope" } });
    const supabase = fakeSupabase({ list });

    await expect(
      deletePreviewObjects(supabase, "user-1", "item-1"),
    ).rejects.toMatchObject({
      code: "storage_failed",
    });
  });
});

describe("removeAllUserPreviewObjects", () => {
  it("does nothing when the user has no preview folders", async () => {
    const list = vi.fn().mockResolvedValue({ data: [], error: null });
    const supabase = fakeSupabase({ list });

    await removeAllUserPreviewObjects(supabase, "user-1");

    expect(list).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledWith("user-1", { limit: 100 });
  });

  // Pagination must survive the listed set shrinking
  // while it's being consumed. `remainingFolders` here plays the role of
  // Storage's real folder listing -- each per-item deletePreviewObjects()
  // call removes its own folder from it, exactly like Storage's own virtual
  // folder disappearing once every object under it is gone. Simulating 150
  // folders (more than one 100-item page) proves the old `offset`-based
  // pagination would have skipped the second page: after page 1's 100
  // folders are deleted, only 50 remain (what used to be folders 100-149),
  // so `offset: 100` on a 50-long remaining set would return nothing and
  // the loop would stop 50 folders short. Always re-listing from the front
  // (no offset) instead always converges on what's actually still there.
  it("survives the listed folder set shrinking mid-pagination and removes every folder", async () => {
    const remainingFolders = Array.from({ length: 150 }, (_, i) => `item-${i}`);
    const removedFolders = new Set<string>();

    const list = vi
      .fn()
      .mockImplementation((prefix: string, opts?: { limit: number }) => {
        if (opts) {
          // Top-level page listing.
          return Promise.resolve({
            data: remainingFolders
              .slice(0, opts.limit)
              .map((name) => ({ name })),
            error: null,
          });
        }
        // Per-item listing made by deletePreviewObjects() itself: one fake
        // object so remove() runs, then the folder "disappears" -- mirrors
        // Storage having no more objects left under that prefix.
        const itemName = prefix.split("/")[1] ?? "";
        const idx = remainingFolders.indexOf(itemName);
        if (idx !== -1) remainingFolders.splice(idx, 1);
        removedFolders.add(itemName);
        return Promise.resolve({ data: [{ name: "obj.webp" }], error: null });
      });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const supabase = fakeSupabase({ list, remove });

    await removeAllUserPreviewObjects(supabase, "user-1");

    expect(removedFolders.size).toBe(150);
    expect(remainingFolders).toHaveLength(0);
    // Every page-listing call is offset-free -- always re-lists from the
    // front of whatever's still there.
    for (const call of list.mock.calls) {
      if (call[1]) expect(call[1]).toEqual({ limit: 100 });
    }
  });

  it("throws a storage_failed PreviewError when a page listing fails", async () => {
    const list = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "nope" } });
    const supabase = fakeSupabase({ list });

    await expect(
      removeAllUserPreviewObjects(supabase, "user-1"),
    ).rejects.toMatchObject({ code: "storage_failed" });
  });

  it("throws a storage_failed PreviewError when pages never converge (loop guard)", async () => {
    const list = vi
      .fn()
      .mockImplementation((_prefix: string, opts?: unknown) => {
        if (opts) {
          // A page that never shrinks -- as if folders weren't actually
          // being removed between iterations.
          return Promise.resolve({
            data: [{ name: "stuck-item" }],
            error: null,
          });
        }
        return Promise.resolve({ data: [{ name: "obj.webp" }], error: null });
      });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const supabase = fakeSupabase({ list, remove });

    await expect(
      removeAllUserPreviewObjects(supabase, "user-1"),
    ).rejects.toMatchObject({ code: "storage_failed" });
  });
});
