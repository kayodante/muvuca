import { beforeEach, describe, expect, it, vi } from "vitest";

const { getTagsByIdsMock, notFoundMock, redirectMock } = vi.hoisted(() => ({
  getTagsByIdsMock: vi.fn(),
  notFoundMock: vi.fn().mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirectMock: vi.fn().mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
}));
vi.mock("@/lib/database/queries/tags", () => ({
  getTagsByIds: getTagsByIdsMock,
}));

import LegacyTagRedirectPage from "./page";

const TAG_ID = "804d9a44-bd63-4e7f-9919-6d9dbf2e5032";

function visit(
  tagId: string,
  searchParams: Record<string, string | string[] | undefined> = {},
) {
  return LegacyTagRedirectPage({
    params: Promise.resolve({ tagId }),
    searchParams: Promise.resolve(searchParams),
  });
}

describe("/tags/[tagId] (legacy redirect)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to the tag's current friendly path, keeping the query", async () => {
    getTagsByIdsMock.mockResolvedValue([
      { id: TAG_ID, path: "design/recursos-assets/icones/animados" },
    ]);

    await expect(
      visit(TAG_ID, { sort: "oldest", type: ["link", "prompt"] }),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/t/design/recursos-assets/icones/animados?sort=oldest&type=link&type=prompt",
    );
    expect(getTagsByIdsMock).toHaveBeenCalledWith([TAG_ID]);
    // Plain redirect() (307), never permanentRedirect(): the browser would
    // cache a permanent one past the tag's next rename.
    expect(redirectMock.mock.calls[0]).toHaveLength(1);
  });

  it("404s on a malformed id without querying", async () => {
    await expect(visit("not-a-uuid")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getTagsByIdsMock).not.toHaveBeenCalled();
  });

  it("404s when the tag does not exist or belongs to another user (RLS)", async () => {
    getTagsByIdsMock.mockResolvedValue([]);

    await expect(visit(TAG_ID)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
