import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 request boundary (replaces `middleware.ts`). Delegates to
 * `lib/supabase/proxy.ts`, which refreshes the Supabase session cookies and
 * stamps the per-request CSP nonce on the same response.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
