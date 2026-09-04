import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectTarget } from "@/lib/security/redirects";
import { getEnv } from "@/lib/validation/env";
import { logEvent } from "@/lib/security/logging";

/**
 * Magic-link confirmation endpoint. Current `@supabase/ssr` PKCE-with-email
 * guidance: the local custom email template sends `token_hash` + `type`,
 * while hosted Supabase's default template redirects with an authorization
 * `code`. Both are exchanged here using the matching official API.
 *
 * A missing/invalid token, or any verification error, falls back to a
 * generic recoverable error on `/login` -- never a raw error message, so a
 * failed callback never leaks why verification failed.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const flowId = searchParams.get("sb_flow_id");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeRedirectTarget(searchParams.get("next"));

  // Built from the validated `NEXT_PUBLIC_APP_URL` env var, never from
  // `request.url`/`Host`/`X-Forwarded-Host`: those report the server's
  // bound hostname (observed as `localhost` under `next start`, not the
  // origin the client actually used) and, worse, `Host`-family headers can
  // be attacker-influenced behind a misconfigured proxy -- trusting them
  // for a redirect target is a Host-header open-redirect.
  const origin = getEnv().NEXT_PUBLIC_APP_URL;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );

    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }

    logEvent({
      event: "auth.callback_exchange_failed",
      status: "failure",
      errorClass: error.name,
    });
  }

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }

    logEvent({
      event: "auth.callback_verify_failed",
      status: "failure",
      errorClass: error.name,
    });
  }

  return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
}
