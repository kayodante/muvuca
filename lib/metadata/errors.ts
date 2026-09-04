/**
 * Closed union of error codes for the link-preview fetch pipeline
 * (SSRF-hardened fetch + head-metadata parser). Kept in its own module
 * because it is shared by every file under `lib/metadata/`, including the
 * image/storage codes that only PR 3's pipeline produces — `errors.ts` is
 * the one place that union has to be complete.
 *
 * Errors thrown across `lib/metadata/` always carry one of these codes
 * (never a raw exception), so a future caller (PR 3) can log
 * `errorClass`/`code` via `lib/security/logging.ts` without ever needing
 * the exception message, which might otherwise leak a URL or hostname.
 */
export const PREVIEW_ERROR_CODES = [
  "blocked_scheme",
  "blocked_host",
  "blocked_private_ip",
  "dns_failure",
  "too_many_redirects",
  "timeout",
  "http_error",
  "http_gone",
  "invalid_content_type",
  "too_large",
  "no_image_found",
  "image_fetch_failed",
  "image_rejected",
  "decode_failed",
  "storage_failed",
  "unknown",
] as const;

export type PreviewErrorCode = (typeof PREVIEW_ERROR_CODES)[number];

/**
 * `Error` subclass carrying a closed `PreviewErrorCode`. Callers should
 * always throw/catch `PreviewError`, never a bare `Error`, so the code is
 * always available for retry decisions and (in PR 3) structured logging.
 */
export class PreviewError extends Error {
  readonly code: PreviewErrorCode;

  constructor(code: PreviewErrorCode, message?: string) {
    super(message ?? code);
    this.name = "PreviewError";
    this.code = code;
  }
}

/**
 * Whether `code` should never be retried. Security-blocking codes and
 * definitive HTTP outcomes are permanent; transient network/size/storage
 * failures are not.
 *
 * Written as an exhaustive `switch` (no `default` fallthrough returning a
 * bare boolean) so adding a new `PreviewErrorCode` without updating this
 * function is a compile error, not a silent runtime gap.
 */
export function isPermanent(code: PreviewErrorCode): boolean {
  switch (code) {
    case "blocked_scheme":
    case "blocked_host":
    case "blocked_private_ip":
    case "http_gone":
    case "invalid_content_type":
    case "image_rejected":
    case "decode_failed":
      return true;
    case "dns_failure":
    case "too_many_redirects":
    case "timeout":
    case "http_error":
    case "too_large":
    case "no_image_found":
    case "image_fetch_failed":
    case "storage_failed":
    case "unknown": {
      return false;
    }
    default: {
      const exhaustiveCheck: never = code;
      return exhaustiveCheck;
    }
  }
}
