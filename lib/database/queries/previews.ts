import { logEvent } from "@/lib/security/logging";
import { createClient } from "@/lib/supabase/server";

/** One row of `link_previews`, camelCased for the frontend. */
export type PreviewSummary = {
  status: "pending" | "ready" | "failed";
  thumbnailHash: string | null;
  thumbnailWidth: number | null;
  thumbnailHeight: number | null;
  faviconHash: string | null;
  remoteDescription: string | null;
  siteName: string | null;
  errorCode: string | null;
};

/**
 * Second, indexed query over the current page's item ids -- deliberately
 * not part of `search_library` (that RPC's `returns table` stays
 * untouched). Ids with no `link_previews` row (prompt/code_component, or a
 * link whose enrichment trigger has not run yet) are simply absent from the
 * map, never present with `null` values or a thrown error.
 */
export async function getPreviewsForItems(
  itemIds: string[],
): Promise<Map<string, PreviewSummary>> {
  if (itemIds.length === 0) return new Map();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("link_previews")
    .select(
      "item_id, status, thumbnail_hash, thumbnail_width, thumbnail_height, favicon_hash, remote_description, site_name, error_code",
    )
    .in("item_id", itemIds);

  if (error) {
    // Previews are decorative: a transient failure
    // on this second, non-load-bearing query must not 500 the whole
    // library page the way `search_library`'s own throw legitimately can.
    logEvent({
      event: "preview.list_failed",
      status: "failure",
      errorClass: error.code,
    });
    return new Map();
  }

  const previews = new Map<string, PreviewSummary>();
  for (const row of data ?? []) {
    previews.set(row.item_id, {
      status: row.status,
      thumbnailHash: row.thumbnail_hash,
      thumbnailWidth: row.thumbnail_width,
      thumbnailHeight: row.thumbnail_height,
      faviconHash: row.favicon_hash,
      remoteDescription: row.remote_description,
      siteName: row.site_name,
      errorCode: row.error_code,
    });
  }
  return previews;
}
