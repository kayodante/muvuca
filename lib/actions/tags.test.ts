import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createClientMock,
  requireUserMock,
  revalidatePathMock,
  logEventMock,
  rpcMock,
  fromMock,
  getTagListMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  requireUserMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  logEventMock: vi.fn(),
  rpcMock: vi.fn(),
  fromMock: vi.fn(),
  getTagListMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: requireUserMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/security/logging", () => ({
  logEvent: logEventMock,
}));

vi.mock("@/lib/database/queries/tags", () => ({
  getTagList: getTagListMock,
}));

import {
  createTag,
  deleteTag,
  listTagsForSelect,
  updateTag,
} from "@/lib/actions/tags";

describe("deleteTag", () => {
  const dummyUser = {
    id: "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
    email: "user@muvuca.test",
  };
  const validTagId = "123e4567-e89b-12d3-a456-426614174000";

  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue(dummyUser);
    rpcMock.mockResolvedValue({ error: null });
    createClientMock.mockResolvedValue({
      rpc: rpcMock,
      from: fromMock,
    });
  });

  it("deletes a tag and reparents children via delete_tag_reparent_children RPC", async () => {
    const formData = new FormData();
    formData.set("id", validTagId);

    const result = await deleteTag(null, formData);

    expect(result).toEqual({ ok: true, data: null });
    expect(rpcMock).toHaveBeenCalledWith("delete_tag_reparent_children", {
      p_tag_id: validTagId,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/tags", "layout");
    expect(logEventMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_FAILED when tag ID is missing or invalid UUID", async () => {
    const formData = new FormData();
    formData.set("id", "invalid-uuid");

    const result = await deleteTag(null, formData);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("VALIDATION_FAILED");
      expect(result.message).toBe("Tag inválida.");
    }
    expect(rpcMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("maps P0001 exception (tag não encontrada) to NOT_FOUND and logs event", async () => {
    rpcMock.mockResolvedValue({
      error: { code: "P0001", message: "tag não encontrada" },
    });

    const formData = new FormData();
    formData.set("id", validTagId);

    const result = await deleteTag(null, formData);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("NOT_FOUND");
      expect(result.message).toBe("Tag não encontrada.");
    }
    expect(logEventMock).toHaveBeenCalledWith({
      event: "tag.delete_failed",
      status: "failure",
      errorClass: "P0001",
      userId: dummyUser.id,
      entityId: validTagId,
    });
  });

  it("maps generic database error and logs event", async () => {
    rpcMock.mockResolvedValue({
      error: { code: "42501", message: "permission denied" },
    });

    const formData = new FormData();
    formData.set("id", validTagId);

    const result = await deleteTag(null, formData);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("UNKNOWN");
      expect(result.message).toBe("Não foi possível concluir a operação.");
    }
    expect(logEventMock).toHaveBeenCalledWith({
      event: "tag.delete_failed",
      status: "failure",
      errorClass: "42501",
      userId: dummyUser.id,
      entityId: validTagId,
    });
  });
});

describe("createTag", () => {
  const dummyUser = {
    id: "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
    email: "user@muvuca.test",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue(dummyUser);
  });

  it("returns VALIDATION_FAILED if name is empty", async () => {
    const formData = new FormData();
    formData.set("name", "");
    formData.set("colorToken", "lime");

    const result = await createTag(null, formData);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("VALIDATION_FAILED");
    }
  });

  it("creates tag successfully and revalidates path", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: "123e4567-e89b-12d3-a456-426614174000" },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    fromMock.mockReturnValue({ insert });
    createClientMock.mockResolvedValue({ from: fromMock });

    const formData = new FormData();
    formData.set("name", "New Tag");
    formData.set("colorToken", "lime");

    const result = await createTag(null, formData);

    expect(result).toEqual({
      ok: true,
      data: { id: "123e4567-e89b-12d3-a456-426614174000" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/tags", "layout");
  });

  it("maps duplicate name error (23505) to DUPLICATE", async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "23505", message: "duplicate key" },
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    fromMock.mockReturnValue({ insert });
    createClientMock.mockResolvedValue({ from: fromMock });

    const formData = new FormData();
    formData.set("name", "Existing Tag");
    formData.set("colorToken", "lime");

    const result = await createTag(null, formData);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("DUPLICATE");
    }
    expect(logEventMock).toHaveBeenCalledWith({
      event: "tag.create_failed",
      status: "failure",
      errorClass: "23505",
      userId: dummyUser.id,
    });
  });
});

describe("updateTag", () => {
  const dummyUser = {
    id: "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
    email: "user@muvuca.test",
  };
  const validTagId = "123e4567-e89b-12d3-a456-426614174000";

  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue(dummyUser);
  });

  it("updates tag successfully and revalidates path", async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: validTagId }, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    fromMock.mockReturnValue({ update });
    createClientMock.mockResolvedValue({ from: fromMock });

    const formData = new FormData();
    formData.set("id", validTagId);
    formData.set("name", "Updated Tag");
    formData.set("colorToken", "emerald");

    const result = await updateTag(null, formData);

    expect(result).toEqual({ ok: true, data: null });
    expect(revalidatePathMock).toHaveBeenCalledWith("/tags", "layout");
  });

  it("returns NOT_FOUND if updated row was not found", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    fromMock.mockReturnValue({ update });
    createClientMock.mockResolvedValue({ from: fromMock });

    const formData = new FormData();
    formData.set("id", validTagId);
    formData.set("name", "Updated Tag");
    formData.set("colorToken", "emerald");

    const result = await updateTag(null, formData);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("NOT_FOUND");
    }
  });
});

describe("listTagsForSelect", () => {
  const dummyUser = {
    id: "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
    email: "user@muvuca.test",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue(dummyUser);
  });

  it("returns the caller's full tag list on success", async () => {
    const tags = [
      {
        id: "tag-1",
        parentId: null,
        name: "Tech",
        description: null,
        colorToken: "blue",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];
    getTagListMock.mockResolvedValue(tags);

    const result = await listTagsForSelect();

    expect(result).toEqual({ ok: true, data: tags });
    expect(logEventMock).not.toHaveBeenCalled();
  });

  it("logs a structured failure event and fails closed when the query throws", async () => {
    getTagListMock.mockRejectedValue(new Error("boom"));

    const result = await listTagsForSelect();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("UNKNOWN");
      expect(result.message).toBe("Não foi possível carregar as tags.");
    }
    expect(logEventMock).toHaveBeenCalledWith({
      event: "tags.select_list_failed",
      status: "failure",
      errorClass: "Error",
      userId: dummyUser.id,
    });
  });
});
