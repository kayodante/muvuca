import type { Database } from "@/lib/database/generated.types";
import {
  getPreviewsForItems,
  type PreviewSummary,
} from "@/lib/database/queries/previews";
import { createClient } from "@/lib/supabase/server";
import {
  parseSearchCursor,
  searchCursorForItem,
  type LibrarySearchParams,
  type SearchSort,
} from "@/lib/validation/search";

export type LibraryItem =
  | {
      id: string;
      type: "link";
      title: string;
      description: string | null;
      url: string;
      content: null;
      tagIds: string[];
    }
  | {
      id: string;
      type: "prompt";
      title: string;
      description: string | null;
      url: null;
      content: string;
      tagIds: string[];
    }
  | {
      id: string;
      type: "code_component";
      title: string;
      description: string | null;
      url: string | null;
      content: string;
      tagIds: string[];
    };

export type LibraryItemSummary =
  | (Omit<Extract<LibraryItem, { type: "link" }>, "content"> & {
      preview: PreviewSummary | null;
    })
  | (Omit<Extract<LibraryItem, { type: "prompt" }>, "content"> & {
      contentPreview: string;
    })
  | (Omit<Extract<LibraryItem, { type: "code_component" }>, "content"> & {
      contentPreview: string;
    });

export type LibraryItemsPage = {
  items: LibraryItemSummary[];
  nextCursor: string | null;
  prevCursor: string | null;
};

/**
 * Itens por página da biblioteca. O RPC `search_library` recebe `PAGE_SIZE + 1`
 * para detectar a existência da próxima página.
 *
 * ATENÇÃO: este valor é limitado pelo teto do RPC, declarado como
 * `v_max_limit` em
 * `supabase/migrations/20260816210000_0017_search_library_single_query_and_limit_guard.sql`
 * (marcador `SEARCH_LIBRARY_MAX_LIMIT`). Aumentar `PAGE_SIZE` sem antes subir
 * o teto por migration faz o RPC rejeitar a chamada. O teste
 * `__tests__/page-size-rpc-limit.test.ts` falha se os dois lados divergirem.
 */
export const PAGE_SIZE = 48;

/** One indexed RPC covers text, tag-rollup, type and sort filters. */
export async function getLibraryItems(
  search: Pick<
    LibrarySearchParams,
    "q" | "tag" | "type" | "sort" | "cursor"
  > = {},
): Promise<LibraryItemsPage> {
  const sort: SearchSort = search.sort ?? "newest";
  const cursor = parseSearchCursor(search.cursor, sort);
  const isBackward = cursor?.dir === "prev";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_library", {
    p_query: search.q,
    p_tag_id: search.tag,
    p_include_descendants: true,
    p_types: search.type ? [search.type] : undefined,
    p_sort: sort,
    p_cursor: cursor,
    p_limit: PAGE_SIZE + 1,
  });

  if (error) throw error;

  const rows = data ?? [];
  let pageRows: typeof rows;
  let hasMorePrev = false;
  let hasMoreNext = false;

  if (isBackward) {
    hasMorePrev = rows.length > PAGE_SIZE;
    hasMoreNext = true;
    pageRows = rows.slice(0, PAGE_SIZE).reverse();
  } else {
    hasMorePrev = Boolean(cursor);
    hasMoreNext = rows.length > PAGE_SIZE;
    pageRows = rows.slice(0, PAGE_SIZE);
  }

  const first = pageRows[0];
  const last = pageRows.at(-1);

  // Second, indexed query -- deliberately not part of search_library's
  // `returns table`. Only link ids can have a `link_previews` row.
  const linkIds = pageRows
    .filter((row) => row.type === "link")
    .map((row) => row.id);
  const previews = await getPreviewsForItems(linkIds);

  return {
    items: pageRows.map((row) => toLibraryItemSummary(row, previews)),
    prevCursor:
      hasMorePrev && first
        ? searchCursorForItem(
            {
              id: first.id,
              title: first.title,
              createdAt: first.created_at,
              updatedAt: first.updated_at,
            },
            sort,
            "prev",
          )
        : null,
    nextCursor:
      hasMoreNext && last
        ? searchCursorForItem(
            {
              id: last.id,
              title: last.title,
              createdAt: last.created_at,
              updatedAt: last.updated_at,
            },
            sort,
            "next",
          )
        : null,
  };
}

/** Contagem total (rollup, deduplicada) de itens sob uma tag e suas descendentes. */
export async function getLibraryItemsCountForTag(
  tagId: string,
): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("count_library_items_for_tag", {
    p_tag_id: tagId,
  });

  if (error) throw error;

  return data ?? 0;
}

/** Used on demand for viewing/editing a prompt; lists never fetch full bodies. */
export async function getLibraryItemById(
  id: string,
): Promise<LibraryItem | null> {
  const supabase = await createClient();
  const [itemResult, tagsResult] = await Promise.all([
    supabase
      .from("library_items")
      .select("id, type, title, description, url, content")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("item_tags").select("item_id, tag_id").eq("item_id", id),
  ]);

  if (itemResult.error) throw itemResult.error;
  if (tagsResult.error) throw tagsResult.error;
  if (!itemResult.data) return null;

  return toLibraryItem(
    itemResult.data,
    (tagsResult.data ?? []).map((association) => association.tag_id),
  );
}

function toLibraryItemSummary(
  item: {
    id: string;
    type: Database["public"]["Enums"]["item_type"];
    title: string;
    description: string | null;
    url: string | null;
    content_preview: string | null;
    tag_ids: string[];
  },
  previews: Map<string, PreviewSummary>,
): LibraryItemSummary {
  if (item.type === "link" && item.url) {
    return {
      id: item.id,
      type: "link",
      title: item.title,
      description: item.description,
      url: item.url,
      tagIds: item.tag_ids,
      preview: previews.get(item.id) ?? null,
    };
  }

  if (item.type === "prompt") {
    return {
      id: item.id,
      type: "prompt",
      title: item.title,
      description: item.description,
      url: null,
      contentPreview: item.content_preview ?? "",
      tagIds: item.tag_ids,
    };
  }

  if (item.type === "code_component") {
    return {
      id: item.id,
      type: "code_component",
      title: item.title,
      description: item.description,
      url: item.url ?? null,
      contentPreview: item.content_preview ?? "",
      tagIds: item.tag_ids,
    };
  }

  throw new Error("Invalid library item payload.");
}

function toLibraryItem(
  item: {
    id: string;
    type: Database["public"]["Enums"]["item_type"];
    title: string;
    description: string | null;
    url: string | null;
    content: string | null;
  },
  tagIds: string[],
): LibraryItem {
  if (item.type === "link" && item.url) {
    return { ...item, type: "link", url: item.url, content: null, tagIds };
  }

  if (item.type === "prompt" && item.content) {
    return {
      ...item,
      type: "prompt",
      url: null,
      content: item.content,
      tagIds,
    };
  }

  if (item.type === "code_component" && item.content) {
    return {
      ...item,
      type: "code_component",
      url: item.url ?? null,
      content: item.content,
      tagIds,
    };
  }

  throw new Error("Invalid library item payload.");
}
