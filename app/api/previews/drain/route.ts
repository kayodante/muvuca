import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getOptionalUser } from "@/lib/auth/require-user";
import { drainPreviewQueue } from "@/lib/previews/drain";
import { PREVIEW_CLAIM_LIMIT, previewScopeSchema } from "@/lib/validation/item";

const drainRequestSchema = z.object({
  itemIds: previewScopeSchema.optional(),
  limit: z.number().int().min(1).max(PREVIEW_CLAIM_LIMIT).optional(),
});

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

/**
 * The real HTTP contract CLAUDE.md §8 requires for a Route Handler:
 * `drainPreviewQueue` used to be a Server Action, but Server Actions are
 * serialized per client, so a background sweep of the whole (global,
 * per-user) queue starved import/edit/search of the same client -- that's
 * why `usePreviewDrain` used to scope itself to the current page only,
 * leaving the rest of the backlog undrained forever. Moving the drain call
 * to a plain `fetch()`-driven Route Handler takes it out of that queue
 * entirely, so a global background sweep (see `usePreviewDrain`'s "fase
 * global") can safely exist again without reintroducing the starvation
 * that motivated the page scope in the first place. The queue logic itself
 * (`drainPreviewQueue` and its helpers) lives in `lib/previews/drain.ts`,
 * unchanged, so `lib/actions/items.ts` can still call it directly from
 * inside its own Server Action for a single-item post-create sweep.
 *
 * Identity is `getOptionalUser()` (which calls `getClaims()`), not
 * `requireUser()` -- same reasoning as the sibling image route
 * (`app/api/previews/[itemId]/[kind]/route.ts`): `requireUser()`
 * `redirect()`s to `/login` on a missing session, which for a `fetch()`
 * caller is a 307 to an HTML page, not the 401 this endpoint's contract
 * (and its client, and its test suite) expects.
 *
 * `/api` is deliberately outside `proxy.ts`'s matcher (`proxy.ts:14`), so
 * there is no automatic session refresh here: a token that expires mid
 * drain session simply turns into a 401 and the client's loop stops. That
 * is fail-closed and intentional, not a gap to fix.
 *
 * The `sec-fetch-site` check below is an explicit cross-site guard on top
 * of that: the Supabase session cookies are `SameSite=Lax`, so a genuine
 * cross-site request would already arrive without them and fail the 401
 * check above on its own. Server Actions carry built-in origin
 * verification that a plain Route Handler does not, so this header check
 * is what recovers that property here.
 */
export async function POST(request: NextRequest) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") {
    return json({ ok: false, code: "FORBIDDEN" }, 403);
  }

  const user = await getOptionalUser();
  if (!user) {
    return json({ ok: false, code: "UNAUTHORIZED" }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, code: "VALIDATION_FAILED" }, 400);
  }

  const parsed = drainRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json({ ok: false, code: "VALIDATION_FAILED" }, 400);
  }

  const result = await drainPreviewQueue(parsed.data);
  return json(result, 200);
}
