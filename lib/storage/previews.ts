import { PreviewError } from "@/lib/metadata/errors";
import type { createClient } from "@/lib/supabase/server";

/**
 * Storage helpers for the `link-previews` bucket (0023_link_previews.sql).
 * Always takes the caller's own authenticated Supabase client -- never
 * `service_role` -- so every call is subject to the same
 * owner-prefix RLS policies as any other client request.
 */
export type PreviewObjectKind = "thumb" | "icon";

/** The one Storage bucket for link previews (0023_link_previews.sql) -- shared by every call site that needs the literal. */
export const PREVIEW_BUCKET = "link-previews";
const BUCKET = PREVIEW_BUCKET;

/** `${userId}/${itemId}/t_${hash}.webp` (thumbnail) or `i_${hash}.webp` (favicon). */
export function previewObjectKey(
  userId: string,
  itemId: string,
  kind: PreviewObjectKind,
  hash: string,
): string {
  const prefix = kind === "thumb" ? "t" : "i";
  return `${userId}/${itemId}/${prefix}_${hash}.webp`;
}

export async function putPreviewObject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  key: string,
  bytes: Buffer,
): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).upload(key, bytes, {
    contentType: "image/webp",
    upsert: true,
  });

  if (error) {
    throw new PreviewError(
      "storage_failed",
      "Falha ao enviar objeto para o Storage.",
    );
  }
}

/** Removes every object under `${userId}/${itemId}/` -- used by item-delete cleanup and best-effort orphan removal (drainPreviewQueue). */
export async function deletePreviewObjects(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  itemId: string,
): Promise<void> {
  const prefix = `${userId}/${itemId}`;
  const { data, error: listError } = await supabase.storage
    .from(BUCKET)
    .list(prefix);

  if (listError) {
    throw new PreviewError(
      "storage_failed",
      "Falha ao listar objetos do Storage.",
    );
  }

  if (!data || data.length === 0) return;

  const paths = data.map((object) => `${prefix}/${object.name}`);
  const { error: removeError } = await supabase.storage
    .from(BUCKET)
    .remove(paths);

  if (removeError) {
    throw new PreviewError(
      "storage_failed",
      "Falha ao remover objetos do Storage.",
    );
  }
}

/** Supabase Storage's own default `list()` page size -- listing more than this many item-folders under one user's prefix requires pagination. */
const STORAGE_LIST_PAGE_SIZE = 100;

/** Loop guard for removeAllUserPreviewObjects -- 100k item-folders is far beyond any real account, so hitting this means folders aren't actually being removed between pages (a real bug) rather than a legitimately huge account. */
const STORAGE_LIST_MAX_PAGES = 1000;

/**
 * Removes every preview object for every item folder under `${userId}/`
 * (account reset). A page is always re-listed at offset 0, never advanced
 * by offset: each folder's objects are fully removed before the next
 * `list()` call, so that folder (a virtual prefix, not a real object) drops
 * out of the listing on its own -- the next `list()` naturally returns the
 * next remaining chunk. Pagination by `offset` instead would skip folders,
 * because deleting page N's folders shifts what used to be page N+1 back
 * into page N's window before it's ever listed.
 */
export async function removeAllUserPreviewObjects(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<void> {
  for (let page = 0; page < STORAGE_LIST_MAX_PAGES; page++) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(userId, { limit: STORAGE_LIST_PAGE_SIZE });

    if (error) {
      throw new PreviewError(
        "storage_failed",
        "Falha ao listar pastas do Storage.",
      );
    }
    if (!data || data.length === 0) return;

    for (const folder of data) {
      await deletePreviewObjects(supabase, userId, folder.name);
    }
  }

  throw new PreviewError(
    "storage_failed",
    "Falha ao remover objetos do Storage: limite de páginas excedido.",
  );
}
