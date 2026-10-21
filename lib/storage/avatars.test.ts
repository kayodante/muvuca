import { describe, expect, it, vi } from "vitest";

import {
  avatarObjectKey,
  putAvatarObject,
  removeAvatarObjects,
} from "./avatars";

describe("avatarObjectKey", () => {
  it("builds the content-addressed key", () => {
    expect(avatarObjectKey("user-1", "abc")).toBe("user-1/abc.webp");
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

describe("putAvatarObject", () => {
  it("uploads with the webp content type", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const supabase = fakeSupabase({ upload });

    await putAvatarObject(supabase, "user-1/abc.webp", Buffer.from("x"));

    expect(upload).toHaveBeenCalledWith("user-1/abc.webp", Buffer.from("x"), {
      contentType: "image/webp",
      upsert: true,
    });
  });

  it("throws a storage_failed PreviewError when upload fails", async () => {
    const upload = vi.fn().mockResolvedValue({ error: { message: "nope" } });
    const supabase = fakeSupabase({ upload });

    await expect(
      putAvatarObject(supabase, "user-1/abc.webp", Buffer.from("x")),
    ).rejects.toMatchObject({ code: "storage_failed" });
  });
});

describe("removeAvatarObjects", () => {
  it("does nothing when the prefix is empty", async () => {
    const list = vi.fn().mockResolvedValue({ data: [], error: null });
    const remove = vi.fn();
    const supabase = fakeSupabase({ list, remove });

    await removeAvatarObjects(supabase, "user-1", "keep-hash");

    expect(remove).not.toHaveBeenCalled();
  });

  it("keeps keepHash and removes every other object", async () => {
    const list = vi.fn().mockResolvedValue({
      data: [
        { name: "keep-hash.webp" },
        { name: "old-hash.webp" },
        { name: "older-hash.webp" },
      ],
      error: null,
    });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const supabase = fakeSupabase({ list, remove });

    await removeAvatarObjects(supabase, "user-1", "keep-hash");

    expect(remove).toHaveBeenCalledWith([
      "user-1/old-hash.webp",
      "user-1/older-hash.webp",
    ]);
  });

  it("removes everything when keepHash is omitted", async () => {
    const list = vi.fn().mockResolvedValue({
      data: [{ name: "a.webp" }, { name: "b.webp" }],
      error: null,
    });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const supabase = fakeSupabase({ list, remove });

    await removeAvatarObjects(supabase, "user-1");

    expect(remove).toHaveBeenCalledWith(["user-1/a.webp", "user-1/b.webp"]);
  });

  it("does not call remove when every listed object is the one being kept", async () => {
    const list = vi.fn().mockResolvedValue({
      data: [{ name: "keep-hash.webp" }],
      error: null,
    });
    const remove = vi.fn();
    const supabase = fakeSupabase({ list, remove });

    await removeAvatarObjects(supabase, "user-1", "keep-hash");

    expect(remove).not.toHaveBeenCalled();
  });

  it("throws a storage_failed PreviewError when list fails", async () => {
    const list = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "nope" } });
    const supabase = fakeSupabase({ list });

    await expect(removeAvatarObjects(supabase, "user-1")).rejects.toMatchObject(
      { code: "storage_failed" },
    );
  });

  it("throws a storage_failed PreviewError when remove fails", async () => {
    const list = vi.fn().mockResolvedValue({
      data: [{ name: "old-hash.webp" }],
      error: null,
    });
    const remove = vi.fn().mockResolvedValue({ error: { message: "nope" } });
    const supabase = fakeSupabase({ list, remove });

    await expect(removeAvatarObjects(supabase, "user-1")).rejects.toMatchObject(
      { code: "storage_failed" },
    );
  });
});
