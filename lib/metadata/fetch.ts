import * as http from "node:http";
import * as https from "node:https";
import * as dns from "node:dns";

import { PreviewError } from "./errors";
import {
  assertSafeAddress,
  assertSafeUrl,
  defaultSsrfPolicy,
  type SsrfPolicy,
} from "./ssrf";

export type SafeResponse = {
  status: number;
  contentType: string | null;
  body: Buffer;
  finalUrl: URL;
};

export type SafeRequestOptions = {
  /** Hard cap on response body bytes (also validated against Content-Length before reading). */
  maxBytes: number;
  /** Allowlist of accepted base Content-Type values (parameters like `; charset=` are ignored for the comparison). */
  acceptContentTypes: readonly string[];
  /** Default 3. */
  maxRedirects?: number;
  /** Default 3000ms. Time-to-first-response-byte budget, reset per hop. */
  connectTimeoutMs?: number;
  /** Default 8000ms. Wall-clock budget for the whole call, shared across every hop/redirect. */
  totalTimeoutMs?: number;
  /** Injectable for tests (e.g. a permissive policy for a local test server); defaults to `defaultSsrfPolicy()`. */
  policy?: SsrfPolicy;
  /**
   * Default `false` (existing hard-cap behavior: reject with `too_large`,
   * whether the overflow is detected from a declared `Content-Length` or
   * from the body actually exceeding `maxBytes`). When `true`, both cases
   * instead resolve with the bytes read up to `maxBytes` -- the body is
   * truncated, not the request failed. Meant for HTML fetches where only
   * the (small, front-of-document) `<head>` is needed; never set for
   * images, which must decode as a whole file.
   */
  truncateOnOverflow?: boolean;
};

const USER_AGENT = "Muvuca/1.0 (+https://muvuca.app)";

const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_CONNECT_TIMEOUT_MS = 3000;
const DEFAULT_TOTAL_TIMEOUT_MS = 8000;

/**
 * Fetches `url` over `node:http`/`node:https` directly (not the global
 * `fetch()`, which cannot accept a custom `lookup`). Every hop
 * — the initial request and each redirect — is independently validated:
 * `assertSafeUrl`, a single `dns.promises.lookup`, and `assertSafeAddress`
 * against every candidate address before the socket connects. The
 * validated address is then pinned via the request's own `lookup` option,
 * so the socket can never re-resolve to something else (closes the
 * DNS-rebinding TOCTOU window).
 */
export async function safeRequest(
  url: URL,
  options: SafeRequestOptions,
): Promise<SafeResponse> {
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const connectTimeoutMs =
    options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
  const totalTimeoutMs = options.totalTimeoutMs ?? DEFAULT_TOTAL_TIMEOUT_MS;
  const policy = options.policy ?? defaultSsrfPolicy();
  const deadline = Date.now() + totalTimeoutMs;

  let currentUrl = assertSafeUrl(url.href);
  const visited = new Set<string>([currentUrl.href]);
  let redirectCount = 0;

  for (;;) {
    if (Date.now() >= deadline) {
      throw new PreviewError("timeout");
    }

    const address = await resolveSafeAddress(currentUrl.hostname, policy);
    const raw = await performHttpRequest(currentUrl, address, {
      acceptContentTypes: options.acceptContentTypes,
      maxBytes: options.maxBytes,
      connectTimeoutMs,
      deadline,
      truncateOnOverflow: options.truncateOnOverflow ?? false,
    });

    if (raw.kind === "redirect") {
      redirectCount++;
      if (redirectCount > maxRedirects) {
        throw new PreviewError("too_many_redirects");
      }

      const nextUrl = assertSafeUrl(new URL(raw.location, currentUrl).href);
      if (isDisallowedHttpsDowngrade(currentUrl, nextUrl)) {
        throw new PreviewError("blocked_scheme");
      }
      if (visited.has(nextUrl.href)) {
        throw new PreviewError("too_many_redirects");
      }
      visited.add(nextUrl.href);
      currentUrl = nextUrl;
      continue;
    }

    return {
      status: raw.status,
      contentType: raw.contentType,
      body: raw.body,
      finalUrl: currentUrl,
    };
  }
}

/**
 * A redirect may only downgrade `https:` to `http:` when it stays on the
 * same host — otherwise a same-origin HTTPS link could be used
 * to bounce the fetch to an attacker-controlled plaintext endpoint. Kept
 * as a small pure function so this specific security decision is
 * unit-testable with plain `URL` objects, no network required.
 */
export function isDisallowedHttpsDowngrade(
  currentUrl: URL,
  nextUrl: URL,
): boolean {
  return (
    currentUrl.protocol === "https:" &&
    nextUrl.protocol === "http:" &&
    nextUrl.hostname !== currentUrl.hostname
  );
}

/**
 * Resolves `hostname` exactly once and returns the first candidate address
 * that passes `assertSafeAddress` — so a mixed DNS response (some public,
 * some private) uses only the public address, and a fully private response
 * throws `blocked_private_ip` without ever attempting to connect.
 */
async function resolveSafeAddress(
  hostname: string,
  policy: SsrfPolicy,
): Promise<{ address: string; family: 4 | 6 }> {
  const bracketed = hostname.startsWith("[") && hostname.endsWith("]");
  const lookupTarget = bracketed ? hostname.slice(1, -1) : hostname;

  let addresses: dns.LookupAddress[];
  try {
    addresses = await dns.promises.lookup(lookupTarget, {
      all: true,
      verbatim: true,
    });
  } catch {
    throw new PreviewError("dns_failure");
  }
  if (addresses.length === 0) {
    throw new PreviewError("dns_failure");
  }

  for (const candidate of addresses) {
    const family: 4 | 6 = candidate.family === 6 ? 6 : 4;
    try {
      assertSafeAddress(candidate.address, family, policy);
      return { address: candidate.address, family };
    } catch {
      continue;
    }
  }
  throw new PreviewError("blocked_private_ip");
}

type RawRedirect = { kind: "redirect"; location: string };
type RawSuccess = {
  kind: "success";
  status: number;
  contentType: string | null;
  body: Buffer;
};

/**
 * Issues one HTTP request directly against `address` — the `lookup` option
 * ignores whatever hostname Node would otherwise resolve and always hands
 * back the single pre-validated address, so no second DNS resolution ever
 * happens for this hop. Redirects are never auto-followed (Node doesn't do
 * that by default for `http.request`); a 3xx with a `Location` header is
 * surfaced to the caller as `RawRedirect` for `safeRequest`'s loop to
 * re-validate from scratch.
 */
function performHttpRequest(
  url: URL,
  address: { address: string; family: 4 | 6 },
  opts: {
    acceptContentTypes: readonly string[];
    maxBytes: number;
    connectTimeoutMs: number;
    deadline: number;
    truncateOnOverflow: boolean;
  },
): Promise<RawRedirect | RawSuccess> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settleResolve = (value: RawRedirect | RawSuccess) => {
      if (settled) return;
      settled = true;
      clearTimeout(connectTimer);
      clearTimeout(wallTimer);
      resolve(value);
    };
    const settleReject = (error: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(connectTimer);
      clearTimeout(wallTimer);
      reject(error);
    };

    const transport = url.protocol === "https:" ? https : http;
    const hostnameForTls =
      url.hostname.startsWith("[") && url.hostname.endsWith("]")
        ? url.hostname.slice(1, -1)
        : url.hostname;

    const customLookup: (
      hostname: string,
      lookupOptions:
        | dns.LookupOptions
        | ((
            err: NodeJS.ErrnoException | null,
            address: string,
            family: number,
          ) => void),
      callback?: (
        err: NodeJS.ErrnoException | null,
        address: string,
        family: number,
      ) => void,
    ) => void = (_hostname, lookupOptionsOrCallback, callback) => {
      const cb =
        typeof lookupOptionsOrCallback === "function"
          ? lookupOptionsOrCallback
          : callback;
      cb?.(null, address.address, address.family);
    };

    // `http.RequestOptions` doesn't type `autoSelectFamily` even though
    // Node's runtime accepts and forwards it to the underlying socket
    // connect options (same as `net.NetConnectOpts`); widen locally rather
    // than reach for `any`.
    const requestOptions: http.RequestOptions & { autoSelectFamily?: boolean } =
      {
        protocol: url.protocol,
        hostname: hostnameForTls,
        port: url.port
          ? Number(url.port)
          : url.protocol === "https:"
            ? 443
            : 80,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        lookup: customLookup,
        // Node's Happy Eyeballs (`autoSelectFamily`, default on since Node
        // 20) calls a custom `lookup` with `{ all: true }` and expects an
        // array-of-addresses callback instead of the classic single
        // `(err, address, family)` form. We already resolved and validated
        // exactly one address ourselves (`resolveSafeAddress`); disabling
        // this keeps `customLookup` on the simple, predictable single-address
        // contract and guarantees the socket connects to that one address.
        autoSelectFamily: false,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: opts.acceptContentTypes.join(", ") || "*/*",
          "Accept-Encoding": "identity",
        },
      };
    const req = transport.request(requestOptions);

    const connectTimer = setTimeout(() => {
      req.destroy();
      settleReject(new PreviewError("timeout"));
    }, opts.connectTimeoutMs);

    const remainingMs = Math.max(opts.deadline - Date.now(), 0);
    const wallTimer = setTimeout(() => {
      req.destroy();
      settleReject(new PreviewError("timeout"));
    }, remainingMs);

    req.on("error", () => {
      settleReject(new PreviewError("unknown"));
    });

    req.on("response", (res) => {
      clearTimeout(connectTimer);

      const status = res.statusCode ?? 0;

      if (status >= 300 && status < 400) {
        const location =
          typeof res.headers.location === "string"
            ? res.headers.location
            : null;
        res.resume(); // discard body, we don't need it
        if (location) {
          settleResolve({ kind: "redirect", location });
        } else {
          settleReject(new PreviewError("http_error"));
        }
        return;
      }

      if (status === 410) {
        res.resume();
        settleReject(new PreviewError("http_gone"));
        return;
      }

      if (status < 200 || status >= 300) {
        res.resume();
        settleReject(new PreviewError("http_error"));
        return;
      }

      const contentTypeHeader =
        typeof res.headers["content-type"] === "string"
          ? res.headers["content-type"]
          : null;
      const baseType =
        contentTypeHeader?.split(";")[0]?.trim().toLowerCase() ?? null;
      if (!baseType || !opts.acceptContentTypes.includes(baseType)) {
        res.resume();
        settleReject(new PreviewError("invalid_content_type"));
        return;
      }

      const declaredLength =
        typeof res.headers["content-length"] === "string"
          ? Number(res.headers["content-length"])
          : null;
      if (
        !opts.truncateOnOverflow &&
        declaredLength !== null &&
        Number.isFinite(declaredLength) &&
        declaredLength > opts.maxBytes
      ) {
        res.destroy();
        settleReject(new PreviewError("too_large"));
        return;
      }
      // else (truncateOnOverflow): ignore the declared length up front --
      // keep reading, and let the byte-count check below truncate once the
      // body actually reaches maxBytes.

      const chunks: Buffer[] = [];
      let received = 0;
      res.on("data", (chunk: Buffer) => {
        received += chunk.length;
        if (received > opts.maxBytes) {
          if (opts.truncateOnOverflow) {
            const keep = chunk.length - (received - opts.maxBytes);
            if (keep > 0) chunks.push(chunk.subarray(0, keep));
            res.destroy();
            req.destroy();
            settleResolve({
              kind: "success",
              status,
              contentType: contentTypeHeader,
              body: Buffer.concat(chunks),
            });
            return;
          }
          res.destroy();
          req.destroy();
          settleReject(new PreviewError("too_large"));
          return;
        }
        chunks.push(chunk);
      });
      res.on("end", () => {
        settleResolve({
          kind: "success",
          status,
          contentType: contentTypeHeader,
          body: Buffer.concat(chunks),
        });
      });
      res.on("error", () => {
        settleReject(new PreviewError("unknown"));
      });
    });

    req.end();
  });
}
