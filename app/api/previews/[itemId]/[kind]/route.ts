import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getOptionalUser } from "@/lib/auth/require-user";
import { PREVIEW_BUCKET, previewObjectKey } from "@/lib/storage/previews";
import { createClient } from "@/lib/supabase/server";
import { itemIdSchema } from "@/lib/validation/item";

const kindSchema = z.enum(["thumb", "icon"]);

function empty(status: number) {
  return new NextResponse(null, { status });
}

/**
 * Same-origin preview image proxy: the app never points an `<img>` at a
 * remote URL, only this route's own re-encoded WebP already sitting in our
 * Storage bucket. Deliberately outside `proxy.ts`'s matcher (`proxy.ts:15`
 * excludes `/api`) -- a hash-addressed, immutable asset needs neither the
 * per-request CSP nonce nor automatic session refresh on every request, so
 * an expired token here fails closed as 401 instead of trying to refresh
 * it. Identity is always verified server-side rather than trusting a
 * cookie-loaded session object on its own -- `getOptionalUser()` calls
 * `getClaims()`.
 *
 * `requireUser()` is deliberately not reused here even though it exists for
 * this exact purpose in most of the app: it `redirect()`s to `/login` on a
 * missing session, which for an `<img>` request is a 307 to an HTML page,
 * not the 401 this endpoint's own contract (and its test suite) calls for.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string; kind: string }> },
) {
  const { itemId, kind } = await params;

  const parsedItemId = itemIdSchema.safeParse(itemId);
  const parsedKind = kindSchema.safeParse(kind);
  if (!parsedItemId.success || !parsedKind.success) {
    return empty(400);
  }

  const user = await getOptionalUser();
  if (!user) {
    return empty(401);
  }

  const version = new URL(request.url).searchParams.get("v");
  if (!version) return empty(404);

  const supabase = await createClient();

  // RLS scopes this to the caller's own rows -- another user's item simply
  // returns zero rows here, which this treats the same as "does not exist"
  // (404, never 403) so the response never confirms the item exists at all.
  const { data: preview, error } = await supabase
    .from("link_previews")
    .select("thumbnail_hash, favicon_hash")
    .eq("item_id", parsedItemId.data)
    .maybeSingle();

  if (error || !preview) return empty(404);

  const hash =
    parsedKind.data === "thumb" ? preview.thumbnail_hash : preview.favicon_hash;
  if (!hash || hash !== version) return empty(404);

  // The Storage key is always rebuilt from validated inputs -- never a
  // free-form path read back from the database.
  const key = previewObjectKey(
    user.id,
    parsedItemId.data,
    parsedKind.data,
    hash,
  );
  const { data: blob, error: downloadError } = await supabase.storage
    .from(PREVIEW_BUCKET)
    .download(key);

  if (downloadError || !blob) return empty(404);

  return new NextResponse(blob, {
    status: 200,
    headers: {
      "Content-Type": "image/webp",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=31536000, immutable",
      "Content-Length": String(blob.size),
    },
  });
}
