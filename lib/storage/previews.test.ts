import { describe, expect, it, vi } from "vitest";
import type { createClient } from "@/lib/supabase/server";

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
  } as unknown as Awaited<ReturnType<typeof createClient>>;
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
    const remove = vi.fn();
    const supabase = fakeSupabase({ list, remove });

    await removeAllUserPreviewObjects(supabase, "user-1");

    expect(list).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledWith("user-1", { limit: 100 });
    expect(remove).not.toHaveBeenCalled();
  });

  it("issues one remove() call per listed page, containing the paths of every folder in that page", async () => {
    const list = vi
      .fn()
      .mockImplementation((prefix: string, opts?: { limit: number }) => {
        if (opts) {
          // Folder listing
          if (prefix === "user-2") {
            // Return two folders
            return Promise.resolve({
              data: [{ name: "item-a" }, { name: "item-b" }],
              error: null,
            });
          }
          return Promise.resolve({ data: [], error: null });
        }

        // Inner file listing
        if (prefix === "user-2/item-a") {
          return Promise.resolve({ data: [{ name: "t_a.webp" }], error: null });
        }
        if (prefix === "user-2/item-b") {
          return Promise.resolve({ data: [{ name: "i_b.webp" }], error: null });
        }
        return Promise.resolve({ data: [], error: null });
      });

    // Mock remove so that the loop doesn't spin infinitely
    const remove = vi.fn().mockImplementation(() => {
      // Clear the folders so next list returns empty
      list.mockImplementation(() => {
        return Promise.resolve({ data: [], error: null });
      });
      return Promise.resolve({ error: null });
    });

    const supabase = fakeSupabase({ list, remove });

    await removeAllUserPreviewObjects(supabase, "user-2");

    expect(remove).toHaveBeenCalledTimes(1);

    // Check paths are collected correctly across the page
    const pathsArg = remove.mock.calls[0][0];
    expect(pathsArg).toContain("user-2/item-a/t_a.webp");
    expect(pathsArg).toContain("user-2/item-b/i_b.webp");
    expect(pathsArg).toHaveLength(2);
  });

  it("survives the listed folder set shrinking mid-pagination and lists next page at offset 0", async () => {
    const remainingFolders = Array.from({ length: 150 }, (_, i) => `item-${i}`);
    let removeCalls = 0;

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
        return Promise.resolve({ data: [{ name: "obj.webp" }], error: null });
      });

    const remove = vi.fn().mockImplementation((paths: string[]) => {
      removeCalls++;
      // remove is called with flattened paths.
      // we extract the folder names and remove them from remainingFolders
      for (const p of paths) {
        const parts = p.split("/");
        const folder = parts[1];
        const idx = remainingFolders.indexOf(folder);
        if (idx !== -1) remainingFolders.splice(idx, 1);
      }
      return Promise.resolve({ error: null });
    });

    const supabase = fakeSupabase({ list, remove });

    await removeAllUserPreviewObjects(supabase, "user-1");

    expect(remainingFolders).toHaveLength(0);
    // 150 items with 100 per page = 2 remove calls
    expect(removeCalls).toBe(2);

    // Every page-listing call is offset-free -- always re-lists from the front
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

  it("throws a storage_failed PreviewError when a folder listing fails, and does not call remove for that page", async () => {
    const list = vi
      .fn()
      .mockImplementation((prefix: string, opts?: { limit: number }) => {
        if (opts) {
          return Promise.resolve({
            data: [{ name: "item-a" }, { name: "item-b" }],
            error: null,
          });
        }
        if (prefix === "user-1/item-b") {
          return Promise.resolve({ data: null, error: { message: "nope" } });
        }
        return Promise.resolve({ data: [{ name: "obj.webp" }], error: null });
      });

    const remove = vi.fn().mockResolvedValue({ error: null });
    const supabase = fakeSupabase({ list, remove });

    await expect(
      removeAllUserPreviewObjects(supabase, "user-1"),
    ).rejects.toMatchObject({ code: "storage_failed" });

    expect(remove).not.toHaveBeenCalled();
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

  it("processes deletions with bounded concurrency", async () => {
    // Generate a page larger than the concurrency limit
    const pageFolders = Array.from({ length: 10 }, (_, i) => `item-${i}`);
    let currentInFlight = 0;
    let peakInFlight = 0;

    const list = vi
      .fn()
      .mockImplementation((prefix: string, opts?: { limit: number }) => {
        if (opts) {
          if (pageFolders.length === 0)
            return Promise.resolve({ data: [], error: null });
          return Promise.resolve({
            data: pageFolders.map((name) => ({ name })),
            error: null,
          });
        }

        // Inner list()
        currentInFlight++;
        if (currentInFlight > peakInFlight) {
          peakInFlight = currentInFlight;
        }

        return new Promise((resolve) => {
          setTimeout(() => {
            currentInFlight--;
            resolve({ data: [{ name: "obj.webp" }], error: null });
          }, 10);
        });
      });

    const remove = vi.fn().mockImplementation(() => {
      // Empty the pageFolders to stop loop
      pageFolders.length = 0;
      return Promise.resolve({ error: null });
    });

    const supabase = fakeSupabase({ list, remove });

    await removeAllUserPreviewObjects(supabase, "user-1");

    expect(pageFolders).toHaveLength(0);
    // Uses the imported STORAGE_DELETE_CONCURRENCY of 3
    expect(peakInFlight).toBe(3);
  });
});
