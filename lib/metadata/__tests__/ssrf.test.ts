import net from "node:net";
import { describe, expect, it } from "vitest";

import { PreviewError, type PreviewErrorCode } from "@/lib/metadata/errors";
import {
  assertSafeAddress,
  assertSafeUrl,
  buildBlockList,
  defaultSsrfPolicy,
  type SsrfPolicy,
} from "@/lib/metadata/ssrf";

/**
 * Mirrors what `fetch.ts` does before ever opening a socket: validate the
 * URL, and if its (already-normalized) hostname is itself an IP literal,
 * check that literal against the policy directly — no DNS involved, so
 * nothing needs mocking for any case in `NO_DNS_CASES` below.
 */
function checkUrl(raw: string, policy: SsrfPolicy): PreviewErrorCode | "ok" {
  try {
    const url = assertSafeUrl(raw);
    const bracketed =
      url.hostname.startsWith("[") && url.hostname.endsWith("]");
    const literal = bracketed ? url.hostname.slice(1, -1) : url.hostname;
    const family = bracketed ? 6 : net.isIP(literal) === 4 ? 4 : null;
    if (family) {
      assertSafeAddress(literal, family, policy);
    }
    return "ok";
  } catch (error) {
    if (error instanceof PreviewError) return error.code;
    throw error;
  }
}

const NO_DNS_CASES: Array<[string, PreviewErrorCode]> = [
  ["http://localhost/", "blocked_host"],
  ["http://LOCALHOST/", "blocked_host"],
  ["http://foo.localhost/", "blocked_host"],
  ["http://metadata.google.internal/", "blocked_host"],
  ["http://metadata.goog/", "blocked_host"],
  ["http://algo.internal/", "blocked_host"],
  ["http://algo.local/", "blocked_host"],
  ["http://127.0.0.1/", "blocked_private_ip"],
  ["http://127.1/", "blocked_private_ip"],
  ["http://0.0.0.0/", "blocked_private_ip"],
  ["http://0x7f.0x0.0x0.0x1/", "blocked_private_ip"],
  ["http://2130706433/", "blocked_private_ip"],
  ["http://10.0.0.5/", "blocked_private_ip"],
  ["http://172.16.0.1/", "blocked_private_ip"],
  ["http://172.31.255.254/", "blocked_private_ip"],
  ["http://192.168.1.1/", "blocked_private_ip"],
  ["http://169.254.169.254/", "blocked_private_ip"],
  ["http://169.254.170.2/", "blocked_private_ip"],
  ["http://100.64.0.1/", "blocked_private_ip"],
  ["http://198.18.0.1/", "blocked_private_ip"],
  ["http://224.0.0.1/", "blocked_private_ip"],
  ["http://240.0.0.1/", "blocked_private_ip"],
  ["http://[::1]/", "blocked_private_ip"],
  ["http://[::]/", "blocked_private_ip"],
  ["http://[fe80::1]/", "blocked_private_ip"],
  ["http://[fc00::1]/", "blocked_private_ip"],
  ["http://[fd00:ec2::254]/", "blocked_private_ip"],
  ["http://[ff02::1]/", "blocked_private_ip"],
  ["http://[::ffff:127.0.0.1]/", "blocked_private_ip"],
  ["http://[::ffff:10.0.0.1]/", "blocked_private_ip"],
  ["http://[64:ff9b::7f00:1]/", "blocked_private_ip"],
  ["http://[2002:7f00:1::]/", "blocked_private_ip"],
  ["http://[2001:db8::1]/", "blocked_private_ip"],
  ["file:///etc/passwd", "blocked_scheme"],
  ["ftp://x/", "blocked_scheme"],
  ["javascript:alert(1)", "blocked_scheme"],
  ["data:text/html,<x>", "blocked_scheme"],
  ["http://user:pass@example.com/", "blocked_scheme"],
];

describe("assertSafeUrl / assertSafeAddress (no DNS mocked)", () => {
  const policy = defaultSsrfPolicy();

  it.each(NO_DNS_CASES)("%s -> %s", (raw, expected) => {
    expect(checkUrl(raw, policy)).toBe(expected);
  });

  it("permits an address just outside the 172.16.0.0/12 block (off-by-one guard)", () => {
    expect(checkUrl("http://172.32.0.1/", policy)).toBe("ok");
  });

  it("permits a normal public https URL", () => {
    expect(checkUrl("https://example.com/page", policy)).toBe("ok");
  });

  it("rejects a URL longer than 4096 characters", () => {
    const longPath = "a".repeat(4090);
    expect(checkUrl(`https://example.com/${longPath}`, policy)).toBe(
      "blocked_scheme",
    );
  });

  it("rejects an unparsable URL", () => {
    expect(checkUrl("not a url", policy)).toBe("blocked_scheme");
  });

  it("never opens a socket while rejecting a blocked case", () => {
    // net.isIP / assertSafeAddress are pure and synchronous; nothing here
    // ever touches node:http, node:https or node:dns. This test documents
    // that guarantee for reviewers: if `checkUrl` above needed a live
    // socket to decide, this whole `describe` block would hang or fail
    // under a network-less sandbox instead of returning synchronously.
    expect(checkUrl("http://10.0.0.1/", policy)).toBe("blocked_private_ip");
  });
});

describe("defaultSsrfPolicy / buildBlockList", () => {
  it("builds a fresh BlockList instance each call", () => {
    const a = defaultSsrfPolicy();
    const b = defaultSsrfPolicy();
    expect(a.blockList).not.toBe(b.blockList);
    expect(a.blockList).toBeInstanceOf(net.BlockList);
  });

  it("buildBlockList blocks the core IPv4 private ranges", () => {
    const blockList = buildBlockList();
    expect(blockList.check("127.0.0.1", "ipv4")).toBe(true);
    expect(blockList.check("8.8.8.8", "ipv4")).toBe(false);
  });

  it("blockedHostnames contains the explicit denylist", () => {
    const policy = defaultSsrfPolicy();
    expect(policy.blockedHostnames.has("localhost")).toBe(true);
    expect(policy.blockedHostnames.has("metadata.google.internal")).toBe(true);
  });
});

describe("assertSafeAddress", () => {
  it("throws blocked_private_ip for a blocked IPv4 address", () => {
    const policy = defaultSsrfPolicy();
    expect(() => assertSafeAddress("127.0.0.1", 4, policy)).toThrow(
      PreviewError,
    );
    try {
      assertSafeAddress("127.0.0.1", 4, policy);
    } catch (error) {
      expect((error as PreviewError).code).toBe("blocked_private_ip");
    }
  });

  it("does not throw for a public IPv4 address", () => {
    const policy = defaultSsrfPolicy();
    expect(() => assertSafeAddress("1.2.3.4", 4, policy)).not.toThrow();
  });

  it("does not throw for a public IPv6 address", () => {
    const policy = defaultSsrfPolicy();
    expect(() =>
      assertSafeAddress("2001:4860:4860::8888", 6, policy),
    ).not.toThrow();
  });

  it("does not throw for an IPv6 address with an unparsable embedded IPv4 tail", () => {
    // Not a real NAT64/6to4 address, and the embedded "IPv4" is out of
    // range — the embedded-address extractor must fail closed (return
    // null) rather than throw, and net.BlockList itself also tolerates
    // this malformed literal by returning false.
    const policy = defaultSsrfPolicy();
    expect(() =>
      assertSafeAddress("::ffff:999.999.999.999", 6, policy),
    ).not.toThrow();
  });

  it("does not throw for a fully-expanded IPv6 address with the wrong group count", () => {
    const policy = defaultSsrfPolicy();
    expect(() => assertSafeAddress("1:2:3:4:5:6:7", 6, policy)).not.toThrow();
  });

  it("does not throw for a valid fully-expanded (8-group, no '::') public IPv6 address", () => {
    const policy = defaultSsrfPolicy();
    expect(() =>
      assertSafeAddress("2001:4860:4860:0:0:0:0:8888", 6, policy),
    ).not.toThrow();
  });

  it("does not throw for a public IPv6 address with a dotted-decimal IPv4 tail (deprecated IPv4-compatible form)", () => {
    // Not the ::ffff:-prefixed IPv4-mapped form (which net.BlockList
    // already unwraps natively) and not NAT64/6to4 either — just exercises
    // the dotted-quad-tail branch of the internal IPv6 byte parser with a
    // successful parse.
    const policy = defaultSsrfPolicy();
    expect(() =>
      assertSafeAddress("64:ff9c::192.0.2.1", 6, policy),
    ).not.toThrow();
  });

  it("does not throw for garbage IPv6-shaped input the internal parser must fail closed on", () => {
    const policy = defaultSsrfPolicy();
    // Two "::" (ambiguous contraction).
    expect(() => assertSafeAddress("1::2::3", 6, policy)).not.toThrow();
    // "::" plus more groups than can possibly fit in 128 bits.
    expect(() =>
      assertSafeAddress("1:2:3:4:5:6:7:8:9::", 6, policy),
    ).not.toThrow();
    // A group that isn't valid hex.
    expect(() =>
      assertSafeAddress("abcd:xyz1:0:0:0:0:0:1", 6, policy),
    ).not.toThrow();
    // A dotted "IPv4" tail with the wrong number of segments.
    expect(() => assertSafeAddress("::1.2.3", 6, policy)).not.toThrow();
  });
});

describe("assertSafeUrl escape hatch check", () => {
  it("cannot be disabled by an environment variable", () => {
    const original = process.env.MUVUCA_DISABLE_SSRF_CHECKS;
    process.env.MUVUCA_DISABLE_SSRF_CHECKS = "true";
    try {
      expect(checkUrl("http://127.0.0.1/", defaultSsrfPolicy())).toBe(
        "blocked_private_ip",
      );
    } finally {
      if (original === undefined) {
        delete process.env.MUVUCA_DISABLE_SSRF_CHECKS;
      } else {
        process.env.MUVUCA_DISABLE_SSRF_CHECKS = original;
      }
    }
  });
});
