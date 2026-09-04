import { z } from "zod";

import { itemTypeSchema } from "@/lib/validation/item";

export const SEARCH_SORTS = [
  "newest",
  "oldest",
  "title_asc",
  "title_desc",
  "updated",
] as const;

export type SearchSort = (typeof SEARCH_SORTS)[number];

export const searchSortSchema = z.enum(SEARCH_SORTS);

const searchQuerySchema = z.string().trim().min(1).max(240).optional();

export const librarySearchParamsSchema = z
  .object({
    q: searchQuerySchema,
    tag: z.uuid().optional(),
    type: itemTypeSchema.optional(),
    sort: searchSortSchema.optional(),
    cursor: z.string().min(1).max(512).optional(),
    create: z.literal("1").optional(),
    import: z.literal("1").optional(),
  })
  .strip();

export type LibrarySearchParams = z.infer<typeof librarySearchParamsSchema>;

export type CursorDirection = "next" | "prev";

export type SearchCursor =
  | {
      sort: "newest" | "oldest" | "updated";
      timestamp: string;
      id: string;
      dir?: CursorDirection;
    }
  | {
      sort: "title_asc" | "title_desc";
      title: string;
      id: string;
      dir?: CursorDirection;
    };

const searchCursorSchema = z.discriminatedUnion("sort", [
  z.object({
    sort: z.enum(["newest", "oldest", "updated"]),
    timestamp: z.iso.datetime({ offset: true }),
    id: z.uuid(),
    dir: z.enum(["next", "prev"]).optional(),
  }),
  z.object({
    sort: z.enum(["title_asc", "title_desc"]),
    title: z.string().max(240),
    id: z.uuid(),
    dir: z.enum(["next", "prev"]).optional(),
  }),
]);

function decodeBase64Url(value: string): string | null {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

/** Invalid cursors intentionally restart at the first page. */
export function parseSearchCursor(
  value: string | undefined,
  sort: SearchSort,
): SearchCursor | null {
  if (!value) return null;

  const decoded = decodeBase64Url(value);
  if (!decoded) return null;

  try {
    const cursor = searchCursorSchema.safeParse(JSON.parse(decoded));
    return cursor.success && cursor.data.sort === sort ? cursor.data : null;
  } catch {
    return null;
  }
}

export function encodeSearchCursor(cursor: SearchCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function searchCursorForItem(
  item: { id: string; title: string; createdAt: string; updatedAt: string },
  sort: SearchSort,
  dir: CursorDirection = "next",
): string {
  if (sort === "title_asc" || sort === "title_desc") {
    return encodeSearchCursor({ sort, title: item.title, id: item.id, dir });
  }

  return encodeSearchCursor({
    sort,
    timestamp: sort === "updated" ? item.updatedAt : item.createdAt,
    id: item.id,
    dir,
  });
}
