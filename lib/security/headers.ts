/**
 * Baseline security headers.
 * CSP is intentionally excluded here: it requires a per-request nonce
 * and is applied in `proxy.ts`, not in static Next.js config.
 */

const PERMISSIONS_POLICY = [
  "camera=()",
  "microphone=()",
  "geolocation=()",
  "browsing-topics=()",
  "interest-cohort=()",
].join(", ");

export function baselineSecurityHeaders(isProduction: boolean) {
  const headers: { key: string; value: string }[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
  ];

  if (isProduction) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}

/**
 * Builds the nonce-based CSP header value.
 * `unsafe-eval` is only added in development because React's dev build
 * uses `eval` for enhanced error stacks; never present in production.
 *
 * `style-src-attr 'unsafe-inline'` is deliberate and narrow. Base UI
 * positions every popup (Select, DropdownMenu, Tooltip, Sheet) and hides its
 * form inputs through `style` attributes computed at runtime, and Next's
 * route announcer does the same. Nonces and hashes cannot cover a style
 * attribute -- a hash needs `'unsafe-hashes'` and a fixed value, and these
 * values change per interaction -- so without this directive production
 * shipped mispositioned menus and leaked each Select's hidden input as
 * stray text. Splitting the directive keeps the dangerous half locked: only
 * `style` attributes are exempt, while `<style>` elements and stylesheets
 * stay under `style-src`'s per-request nonce. Style attributes here are
 * never built from user content.
 */
export function buildContentSecurityPolicy(nonce: string, isDev: boolean) {
  const policy = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`};
    style-src-attr 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    connect-src 'self'${isDev ? " ws:" : ""};
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `;

  return policy.replace(/\s{2,}/g, " ").trim();
}
