import { NextResponse, type NextRequest } from "next/server";
import { getOptionalUser } from "@/lib/auth/require-user";
import { AVATAR_BUCKET, avatarObjectKey } from "@/lib/storage/avatars";
import { createClient } from "@/lib/supabase/server";

function empty(status: number) {
  return new NextResponse(null, { status });
}

/**
 * Same-origin profile-photo proxy (ADR-017). Same contract as
 * `app/api/previews/[itemId]/[kind]/route.ts` -- read that route's comment
 * for why it's outside `proxy.ts`'s matcher and why `getOptionalUser()`
 * (never `requireUser()`) is the right identity check here: a missing
 * session must fail closed as 401, not redirect an `<img>` request to
 * `/login`.
 */
export async function GET(request: NextRequest) {
  const user = await getOptionalUser();
  if (!user) {
    return empty(401);
  }

  const version = new URL(request.url).searchParams.get("v");
  if (!version) return empty(404);

  const supabase = await createClient();

  // `.eq("user_id", user.id)` is defense in depth on top of RLS -- another
  // user's row would already be invisible under RLS alone.
  const { data: preferences, error } = await supabase
    .from("user_preferences")
    .select("avatar_hash")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    error ||
    !preferences?.avatar_hash ||
    preferences.avatar_hash !== version
  ) {
    return empty(404);
  }

  const key = avatarObjectKey(user.id, preferences.avatar_hash);
  const { data: blob, error: downloadError } = await supabase.storage
    .from(AVATAR_BUCKET)
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
