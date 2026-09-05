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

const SEARCH_QUERY_MAX_LENGTH = 240;

const searchQuerySchema = z
  .string()
  .trim()
  .min(1)
  .max(SEARCH_QUERY_MAX_LENGTH)
  .optional();

const libraryTagSchema = z.uuid();
const libraryCursorSchema = z.string().min(1).max(512);

const libraryFields = {
  q: searchQuerySchema,
  tag: libraryTagSchema.optional(),
  type: itemTypeSchema.optional(),
  sort: searchSortSchema.optional(),
  cursor: libraryCursorSchema.optional(),
  create: z.literal("1").optional(),
  import: z.literal("1").optional(),
};

export const librarySearchParamsSchema = z.object(libraryFields).strip();

export type LibrarySearchParams = z.infer<typeof librarySearchParamsSchema>;

/**
 * Same rule as `q` above, but truncates overlong input by code point
 * (surrogate-pair safe) instead of rejecting it, so a long query degrades
 * instead of failing validation (AAA-79).
 */
const degradedQSchema = z
  .string()
  .trim()
  .transform((value) => [...value].slice(0, SEARCH_QUERY_MAX_LENGTH).join(""))
  .pipe(z.string().min(1))
  .optional()
  .catch(undefined);

/**
 * Same fields as `librarySearchParamsSchema`, built from the same
 * `libraryFields` definitions, but each invalid value degrades to
 * `undefined` instead of failing the whole parse (AAA-79): an unknown sort,
 * a non-UUID tag, an overlong cursor, etc. no longer 404 the page, they just
 * fall back to "no filter".
 */
const degradedLibrarySearchParamsSchema = z.object({
  q: degradedQSchema,
  tag: libraryFields.tag.catch(undefined),
  type: libraryFields.type.catch(undefined),
  sort: libraryFields.sort.catch(undefined),
  cursor: libraryFields.cursor.catch(undefined),
  create: libraryFields.create.catch(undefined),
  import: libraryFields.import.catch(undefined),
});

/**
 * Parses library search params with graceful degradation (AAA-79): unknown
 * keys are stripped, Next.js array-valued params are unwrapped to their
 * first element, and any invalid value falls back to `undefined` instead of
 * failing validation, so a bad query string never produces a 404.
 */
export function parseLibrarySearchParams(raw: unknown): LibrarySearchParams {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const unwrapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    unwrapped[key] = Array.isArray(value) ? value[0] : value;
  }

  const parsed = degradedLibrarySearchParamsSchema.parse(unwrapped);

  const result: LibrarySearchParams = {};
  if (parsed.q !== undefined) result.q = parsed.q;
  if (parsed.tag !== undefined) result.tag = parsed.tag;
  if (parsed.type !== undefined) result.type = parsed.type;
  if (parsed.sort !== undefined) result.sort = parsed.sort;
  if (parsed.cursor !== undefined) result.cursor = parsed.cursor;
  if (parsed.create !== undefined) result.create = parsed.create;
  if (parsed.import !== undefined) result.import = parsed.import;
  return result;
}

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
