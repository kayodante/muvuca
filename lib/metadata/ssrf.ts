import { BlockList } from "node:net";

import { PreviewError } from "./errors";

/**
 * Injectable SSRF policy: the IP-range blocklist plus an explicit hostname
 * denylist. `defaultSsrfPolicy()` is the production policy; tests that need
 * to talk to a local `127.0.0.1` test server inject a permissive policy
 * instead (see `fetch.test.ts`) — the hostname denylist in `assertSafeUrl`
 * itself is NOT overridable this way, on purpose (see note there).
 */
export type SsrfPolicy = {
  blockList: BlockList;
  blockedHostnames: Set<string>;
};

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/** Mirrors `ITEM_URL_MAX_LENGTH` (`lib/validation/item.ts`). */
const MAX_URL_LENGTH = 4096;

/**
 * Exact hostnames known to resolve (or be treated by the OS/cloud
 * metadata service) as loopback/internal without needing DNS at all.
 */
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.goog",
]);

/** Suffix matches: any hostname ending in one of these is internal-only. */
const BLOCKED_HOSTNAME_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".home.arpa",
];

/**
 * Baked directly into `assertSafeUrl` (not read from an injected
 * `SsrfPolicy`) so there is no parameter a caller could use to bypass the
 * hostname denylist. The server must never fetch a user-supplied URL except
 * through this hardened path, so the denylist has no configuration escape
 * hatch — same reasoning that keeps the IP-range blocking below off of any
 * `process.env` override.
 */
function isBlockedHostname(hostname: string): boolean {
  const bracketless =
    hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : hostname;
  const lower = bracketless.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(lower)) return true;
  return BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

const IPV4_BLOCKED_SUBNETS: ReadonlyArray<readonly [string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
  ["255.255.255.255", 32],
];

const IPV6_BLOCKED_SUBNETS: ReadonlyArray<readonly [string, number]> = [
  ["::", 128],
  ["::1", 128],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
];

/**
 * Builds a fresh `net.BlockList` covering every RFC 1918 / link-local /
 * CGNAT / documentation / multicast / reserved IPv4 range and their IPv6
 * equivalents. `BlockList` natively treats an
 * IPv4-mapped IPv6 address (`::ffff:a.b.c.d`) checked with family `"ipv6"`
 * as a match against the IPv4 rules below — verified against this Node
 * build — so IPv4-mapped addresses need no special-casing here. NAT64
 * (`64:ff9b::/96`) and 6to4 (`2002::/16`) are NOT auto-unwrapped by
 * `BlockList`; `assertSafeAddress` extracts their embedded IPv4 itself.
 */
export function buildBlockList(): BlockList {
  const blockList = new BlockList();
  for (const [address, prefix] of IPV4_BLOCKED_SUBNETS) {
    blockList.addSubnet(address, prefix, "ipv4");
  }
  for (const [address, prefix] of IPV6_BLOCKED_SUBNETS) {
    blockList.addSubnet(address, prefix, "ipv6");
  }
  return blockList;
}

/** The production SSRF policy. Call fresh each time; `BlockList` is cheap to build and this avoids shared mutable state across requests/tests. */
export function defaultSsrfPolicy(): SsrfPolicy {
  return {
    blockList: buildBlockList(),
    blockedHostnames: new Set(BLOCKED_HOSTNAMES),
  };
}

/**
 * Validates protocol, credentials, length and hostname denylist only.
 * Deliberately does NOT resolve DNS or check IP ranges — including when
 * the hostname is itself an IP literal (e.g. `127.0.0.1`, or a legacy
 * form like `2130706433` that `new URL()` already canonicalizes to dotted
 * decimal). That check happens in `fetch.ts` (`dns.promises.lookup` +
 * `assertSafeAddress`, against the *injected* `SsrfPolicy`) once per hop,
 * right before opening the socket, which closes the
 * DNS-rebinding TOCTOU window — `dns.promises.lookup` fast-paths an IP
 * literal locally with no network round trip, so routing IP-literal
 * hostnames through the same path costs nothing and keeps this function
 * honest about the two codes it documents: `blocked_scheme`/`blocked_host`.
 * (`assertSafeAddress` is exported precisely so callers — including this
 * module's own tests — can run that same check standalone.)
 */
export function assertSafeUrl(raw: string): URL {
  if (
    typeof raw !== "string" ||
    raw.length === 0 ||
    raw.length > MAX_URL_LENGTH
  ) {
    throw new PreviewError(
      "blocked_scheme",
      "URL ausente ou excede o tamanho máximo.",
    );
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new PreviewError("blocked_scheme", "URL malformada.");
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new PreviewError("blocked_scheme", "Protocolo não permitido.");
  }

  if (url.username !== "" || url.password !== "") {
    throw new PreviewError(
      "blocked_scheme",
      "URL não pode conter credenciais.",
    );
  }

  if (isBlockedHostname(url.hostname)) {
    throw new PreviewError("blocked_host", "Host bloqueado.");
  }

  return url;
}

/**
 * Checks one already-resolved IP address against `policy`. This is the
 * single point where an IP is judged safe or not — called both for URL
 * hostnames that are themselves IP literals (`assertSafeUrl`, no DNS
 * involved) and for every address `dns.promises.lookup` returns for a
 * domain name (`fetch.ts`, once per hop).
 */
export function assertSafeAddress(
  ip: string,
  family: 4 | 6,
  policy: SsrfPolicy,
): void {
  if (family === 4) {
    if (policy.blockList.check(ip, "ipv4")) {
      throw new PreviewError("blocked_private_ip");
    }
    return;
  }

  if (policy.blockList.check(ip, "ipv6")) {
    throw new PreviewError("blocked_private_ip");
  }

  const bytes = parseIPv6ToBytes(ip);
  if (!bytes) return;

  const embedded = embeddedIPv4FromNat64(bytes) ?? embeddedIPv4From6to4(bytes);
  if (embedded && policy.blockList.check(embedded, "ipv4")) {
    throw new PreviewError("blocked_private_ip");
  }
}

// ---------------------------------------------------------------------
// IPv6 textual-form parsing, used only to extract an embedded IPv4
// address from a NAT64 (64:ff9b::/96) or 6to4 (2002::/16) address so it
// can be re-checked against the IPv4 blocklist. `net.BlockList` handles
// every other IPv6 case (including IPv4-mapped `::ffff:a.b.c.d`) itself.
// ---------------------------------------------------------------------

function ipv4GroupsFromDotted(dotted: string): [string, string] | null {
  const parts = dotted.split(".");
  if (parts.length !== 4) return null;
  const bytes = parts.map((part) => Number(part));
  if (bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) {
    return null;
  }
  const [b0, b1, b2, b3] = bytes as [number, number, number, number];
  return [
    (((b0 << 8) | b1) >>> 0).toString(16),
    (((b2 << 8) | b3) >>> 0).toString(16),
  ];
}

function expandGroupList(part: string): string[] | null {
  if (part.length === 0) return [];
  const groups = part.split(":");
  const last = groups[groups.length - 1];
  if (last && last.includes(".")) {
    const v4 = ipv4GroupsFromDotted(last);
    if (!v4) return null;
    return [...groups.slice(0, -1), ...v4];
  }
  return groups;
}

/** Parses any textual IPv6 form (compressed, expanded, or with an embedded IPv4 dotted-decimal tail) into its 16 raw bytes. Returns `null` for anything unparsable. */
function parseIPv6ToBytes(address: string): number[] | null {
  const withoutZone = address.split("%")[0] ?? "";
  const parts = withoutZone.split("::");
  if (parts.length > 2) return null;

  const head = expandGroupList(parts[0] ?? "");
  const tail = parts.length === 2 ? expandGroupList(parts[1] ?? "") : [];
  if (head === null || tail === null) return null;

  let groups: string[];
  if (parts.length === 1) {
    if (head.length !== 8) return null;
    groups = head;
  } else {
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return null;
    groups = [...head, ...Array<string>(missing).fill("0"), ...tail];
  }
  if (groups.length !== 8) return null;

  const bytes: number[] = [];
  for (const group of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
    const value = parseInt(group, 16);
    bytes.push((value >> 8) & 0xff, value & 0xff);
  }
  return bytes;
}

const NAT64_PREFIX = [0x00, 0x64, 0xff, 0x9b, 0, 0, 0, 0, 0, 0, 0, 0];

/** `64:ff9b::/96` — the embedded IPv4 is the last 4 bytes. */
function embeddedIPv4FromNat64(bytes: number[]): string | null {
  if (!NAT64_PREFIX.every((byte, index) => bytes[index] === byte)) return null;
  return `${bytes[12]}.${bytes[13]}.${bytes[14]}.${bytes[15]}`;
}

/** `2002::/16` — the embedded IPv4 is the next 4 bytes after the 2-byte prefix. */
function embeddedIPv4From6to4(bytes: number[]): string | null {
  if (bytes[0] !== 0x20 || bytes[1] !== 0x02) return null;
  return `${bytes[2]}.${bytes[3]}.${bytes[4]}.${bytes[5]}`;
}
