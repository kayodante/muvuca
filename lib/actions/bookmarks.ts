"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { logEvent } from "@/lib/security/logging";
import { createClient } from "@/lib/supabase/server";
import { chunkArray } from "@/lib/bookmarks/batch";
import {
  bookmarkImportSchema,
  bookmarkUrlsSchema,
} from "@/lib/bookmarks/validation";
import { fail, ok, type ActionResult } from "@/lib/utils/result";

export type BookmarkImportSummary = {
  itemsImported: number;
  tagsCreated: number;
  associationsCreated: number;
  errorsIgnored: number;
};

const DUPLICATE_CHECK_CHUNK_SIZE = 200;

export async function findExistingBookmarkUrls(
  urls: string[],
): Promise<ActionResult<string[]>> {
  const parsed = bookmarkUrlsSchema.safeParse(urls);
  if (!parsed.success) return fail("VALIDATION_FAILED", "Favoritos inválidos.");
  const user = await requireUser();
  const supabase = await createClient();

  const urlChunks = chunkArray(parsed.data, DUPLICATE_CHECK_CHUNK_SIZE);
  const foundUrls: string[] = [];

  for (const chunk of urlChunks) {
    const { data, error } = await supabase
      .from("library_items")
      .select("normalized_url")
      .eq("type", "link")
      .in("normalized_url", chunk);

    if (error) {
      logEvent({
        event: "bookmark.preview_failed",
        status: "failure",
        errorClass: error.code,
        userId: user.id,
      });
      return fail("UNKNOWN", "Não foi possível analisar duplicatas.");
    }

    if (data) {
      for (const item of data) {
        if (item.normalized_url) foundUrls.push(item.normalized_url);
      }
    }
  }

  return ok(foundUrls);
}

export async function importBrowserBookmarks(
  input: unknown,
): Promise<ActionResult<BookmarkImportSummary>> {
  const parsed = bookmarkImportSchema.safeParse(input);
  if (!parsed.success) {
    // Field paths only (e.g. "items.3.title") -- never the Zod message or
    // the value that failed, which could echo user content into the log.
    // Limited to the first few issues.
    const issuePaths = parsed.error.issues
      .slice(0, 3)
      .map((issue) => issue.path.join("."));
    logEvent({
      event: "bookmark.import_validation_failed",
      status: "failure",
      errorClass: `VALIDATION_FAILED:${issuePaths.join(",")}`,
    });
    return fail(
      "VALIDATION_FAILED",
      "A importação precisa ser analisada novamente.",
    );
  }
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_browser_bookmarks", {
    p_tags: parsed.data.tags,
    p_items: parsed.data.items,
  });
  const summary = data?.[0];
  if (error || !summary) {
    logEvent({
      event: "bookmark.import_failed",
      status: "failure",
      errorClass: error?.code,
      userId: user.id,
    });
    return fail("UNKNOWN", "Não foi possível concluir a importação.");
  }
  revalidatePath("/library");
  revalidatePath("/tags", "layout");
  return ok({
    itemsImported: summary.items_imported,
    tagsCreated: summary.tags_created,
    associationsCreated: summary.associations_created,
    errorsIgnored: parsed.data.invalidCount,
  });
}
