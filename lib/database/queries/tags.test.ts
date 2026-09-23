import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, logEventMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  logEventMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/security/logging", () => ({ logEvent: logEventMock }));

import {
  getChildTagCount,
  getTagByPath,
  getTagList,
  getTagsByIds,
} from "@/lib/database/queries/tags";

function row(id: string, parentId: string | null, slug: string, name = id) {
  return {
    id,
    parent_id: parentId,
    name,
    slug,
    description: null,
    color_token: "lime",
    created_at: "2026-09-01T00:00:00+00:00",
    updated_at: "2026-09-01T00:00:00+00:00",
  };
}

describe("getTagList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs a structured failure event before throwing when the query errors", async () => {
    const order = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "42501", name: "PostgrestError", message: "denied" },
    });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });
    createClientMock.mockResolvedValue({ from });

    await expect(getTagList()).rejects.toMatchObject({ code: "42501" });

    expect(logEventMock).toHaveBeenCalledWith({
      event: "tags.list_failed",
      status: "failure",
      errorClass: "42501",
    });
  });

  it("does not log on success", async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });
    createClientMock.mockResolvedValue({ from });

    await expect(getTagList()).resolves.toEqual([]);

    expect(logEventMock).not.toHaveBeenCalled();
  });

  it("derives each tag's slug path from the list itself", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        row("design", null, "design", "Design"),
        row("icones", "design", "icones", "Ícones"),
      ],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });
    createClientMock.mockResolvedValue({ from });

    const tags = await getTagList();

    expect(tags.map((tag) => [tag.id, tag.path])).toEqual([
      ["design", "design"],
      ["icones", "design/icones"],
    ]);
  });
});

describe("getTagsByIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves to [] without touching the client when tagIds is empty", async () => {
    await expect(getTagsByIds([])).resolves.toEqual([]);

    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("deduplicates ids into a single tags_with_ancestors call", async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const select = vi.fn().mockReturnValue({ order });
    const rpc = vi.fn().mockReturnValue({ select });
    createClientMock.mockResolvedValue({ rpc });

    await getTagsByIds(["tag-a", "tag-b", "tag-a"]);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("tags_with_ancestors", {
      p_tag_ids: ["tag-a", "tag-b"],
    });
    // PostgREST rejects ordering an RPC by a column it did not project.
    expect(select.mock.calls[0]?.[0]).toContain("name_normalized");
    expect(order).toHaveBeenCalledWith("name_normalized", { ascending: true });
  });

  it("returns only the requested tags, with paths built from their ancestors", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        row("design", null, "design"),
        row("recursos", "design", "recursos-assets"),
        row("icones", "recursos", "icones"),
      ],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ order });
    const rpc = vi.fn().mockReturnValue({ select });
    createClientMock.mockResolvedValue({ rpc });

    const tags = await getTagsByIds(["icones"]);

    expect(tags).toHaveLength(1);
    expect(tags[0]).toMatchObject({
      id: "icones",
      path: "design/recursos-assets/icones",
    });
  });

  it("logs a structured failure event before throwing when the query errors", async () => {
    const order = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "42501", name: "PostgrestError", message: "denied" },
    });
    const select = vi.fn().mockReturnValue({ order });
    const rpc = vi.fn().mockReturnValue({ select });
    createClientMock.mockResolvedValue({ rpc });

    await expect(getTagsByIds(["tag-a"])).rejects.toMatchObject({
      code: "42501",
    });

    expect(logEventMock).toHaveBeenCalledWith({
      event: "tags.list_by_ids_failed",
      status: "failure",
      errorClass: "42501",
    });
  });
});

describe("getTagByPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockSlugQuery(data: ReturnType<typeof row>[]) {
    const inFn = vi.fn().mockResolvedValue({ data, error: null });
    const select = vi.fn().mockReturnValue({ in: inFn });
    const from = vi.fn().mockReturnValue({ select });
    createClientMock.mockResolvedValue({ from });
    return inFn;
  }

  it("loads every candidate in one query and resolves the chain by parent", async () => {
    const inFn = mockSlugQuery([
      row("design", null, "design", "Design"),
      row("dev", null, "dev", "Dev"),
      row("ref-design", "design", "referencias", "Referências"),
      row("ref-dev", "dev", "referencias", "Referências"),
    ]);

    const resolved = await getTagByPath(["dev", "referencias"]);

    expect(inFn).toHaveBeenCalledTimes(1);
    expect(inFn).toHaveBeenCalledWith("slug", ["dev", "referencias"]);
    expect(resolved?.tag).toMatchObject({
      id: "ref-dev",
      path: "dev/referencias",
    });
    expect(resolved?.ancestors).toEqual([
      { id: "dev", name: "Dev", path: "dev" },
    ]);
  });

  it("returns null when a level of the path does not exist", async () => {
    mockSlugQuery([row("icones", "recursos", "icones")]);

    await expect(getTagByPath(["design", "icones"])).resolves.toBeNull();
  });

  it("logs and throws when the query errors", async () => {
    const inFn = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "42501", name: "PostgrestError", message: "denied" },
    });
    const select = vi.fn().mockReturnValue({ in: inFn });
    const from = vi.fn().mockReturnValue({ select });
    createClientMock.mockResolvedValue({ from });

    await expect(getTagByPath(["design"])).rejects.toMatchObject({
      code: "42501",
    });
    expect(logEventMock).toHaveBeenCalledWith({
      event: "tags.resolve_path_failed",
      status: "failure",
      errorClass: "42501",
    });
  });
});

describe("getChildTagCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves to the exact count of direct children", async () => {
    const eq = vi.fn().mockResolvedValue({ count: 3, error: null });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    createClientMock.mockResolvedValue({ from });

    await expect(getChildTagCount("tag-a")).resolves.toBe(3);

    expect(select).toHaveBeenCalledWith("id", {
      count: "exact",
      head: true,
    });
    expect(eq).toHaveBeenCalledWith("parent_id", "tag-a");
  });

  it("resolves to 0 when count is null", async () => {
    const eq = vi.fn().mockResolvedValue({ count: null, error: null });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    createClientMock.mockResolvedValue({ from });

    await expect(getChildTagCount("tag-a")).resolves.toBe(0);
  });

  it("throws when the query errors", async () => {
    const eq = vi.fn().mockResolvedValue({
      count: null,
      error: { code: "42501", name: "PostgrestError", message: "denied" },
    });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    createClientMock.mockResolvedValue({ from });

    await expect(getChildTagCount("tag-a")).rejects.toMatchObject({
      code: "42501",
    });
  });
});
