import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getTagsByIds } from "@/lib/database/queries/tags";
import { getTagHref } from "@/lib/tags/routes";

/**
 * Legacy `/tags/<uuid>` links (saved before AAA-96) keep working: the UUID
 * is still the tag's identity, so it is resolved to the tag's current slug
 * path and redirected there, query string included.
 *
 * `redirect()` (307), not `permanentRedirect()`: the UUID is permanent but
 * its destination is not -- a rename changes the slug, and a redirect the
 * browser cached as permanent would send the old link to a 404 forever.
 * The `/tags` index lives in the `(index)` route group so its
 * `loading.tsx` does not wrap this page: under a Suspense boundary the
 * response would already be streaming, and the redirect would degrade to a
 * client-side one with status 200.
 *
 * A malformed id, a missing tag and another user's tag all end in the same
 * 404 -- RLS makes the last two indistinguishable by construction. No
 * session check here, like every other page under `(app)`: `proxy.ts`
 * sends `/tags/*` without claims to /login before this renders.
 */
export default async function LegacyTagRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ tagId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ tagId }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  const parsedId = z.uuid().safeParse(tagId);
  if (!parsedId.success) notFound();

  const [tag] = await getTagsByIds([parsedId.data]);
  if (!tag) notFound();

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(rawSearchParams)) {
    for (const entry of [value].flat()) {
      if (entry !== undefined) query.append(key, entry);
    }
  }
  const search = query.size > 0 ? `?${query}` : "";

  redirect(`${getTagHref(tag)}${search}`);
}
