import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildContentSecurityPolicy } from "@/lib/security/headers";

/**
 * Refreshes the Supabase session cookies on every request (current
 * `@supabase/ssr` guidance) and stamps the per-request CSP nonce onto the
 * outgoing request headers -- not just the response -- so Server
 * Components can read it via `headers()`.
 *
 * `getClaims()` verifies the JWT locally against the project's JWKS
 * (asymmetric signing keys) and, as a side effect, refreshes an
 * expired access token from the refresh token. Removing this call, or
 * running code between `createServerClient` and it, can silently log users
 * out -- do not reorder.
 */
export async function updateSession(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const csp = buildContentSecurityPolicy(nonce, isDev);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();

  if (
    !data?.claims &&
    /^\/(?:library|settings|tags)(?:\/|$)/.test(request.nextUrl.pathname)
  ) {
    const redirectResponse = NextResponse.redirect(
      new URL("/login", request.url),
    );
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    redirectResponse.headers.set("Content-Security-Policy", csp);
    redirectResponse.headers.set("Cache-Control", "private, no-store");
    return redirectResponse;
  }

  supabaseResponse.headers.set("x-nonce", nonce);
  supabaseResponse.headers.set("Content-Security-Policy", csp);
  // Authenticated HTML must never enter a shared CDN/browser cache. Static
  // assets are excluded by the proxy matcher and retain Next.js caching.
  supabaseResponse.headers.set("Cache-Control", "private, no-store");

  return supabaseResponse;
}
