import { BlockList } from "node:net";
import * as dns from "node:dns";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";

import { safeRequest } from "@/lib/metadata/fetch";
import { defaultSsrfPolicy, type SsrfPolicy } from "@/lib/metadata/ssrf";

/**
 * DNS-resolution-dependent SSRF scenarios: a domain that resolves to a
 * private IP, a mixed public/private response, DNS rebinding, and
 * redirect chains that only reveal themselves as unsafe once a *new*
 * hostname is resolved mid-chain. `ssrf.test.ts` covers everything that
 * doesn't need DNS; `fetch.test.ts` covers the HTTP mechanics with a
 * permissive policy. This file is where they meet: real `dns.promises`
 * calls are mocked so these scenarios are deterministic and don't touch
 * the network, while the actual HTTP hops go through a real local server.
 */

/** Blocks only 10.0.0.0/8, so 127.0.0.1 (our local test servers) stays reachable while a "private" mocked address is still rejected. */
function policyBlockingOnly10(): SsrfPolicy {
  const blockList = new BlockList();
  blockList.addSubnet("10.0.0.0", 8, "ipv4");
  return { blockList, blockedHostnames: new Set() };
}

/**
 * `dns.promises.lookup` is overloaded (single address vs. `LookupAddress[]`
 * depending on the `all` option), which defeats `vi.spyOn(...).mockResolvedValue`'s
 * type inference. `resolveSafeAddress` always calls it with `{ all: true }`,
 * so this helper pins the mock to that one shape instead of fighting the
 * overload resolution with `any`.
 */
function mockDnsLookup(
  impl: (hostname: string) => Promise<dns.LookupAddress[]>,
) {
  return vi
    .spyOn(dns.promises, "lookup")
    .mockImplementation(impl as unknown as typeof dns.promises.lookup);
}

let servers: http.Server[] = [];

function listen(
  handler: http.RequestListener,
): Promise<{ url: URL; port: number }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    servers.push(server);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({ url: new URL(`http://127.0.0.1:${port}/`), port });
    });
  });
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    servers.map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
          server.closeAllConnections?.();
        }),
    ),
  );
  servers = [];
});

describe("DNS-dependent SSRF scenarios", () => {
  it("throws blocked_private_ip for a domain that resolves to a private IP, without ever requesting", async () => {
    mockDnsLookup(async () => [{ address: "10.0.0.1", family: 4 }]);
    const requestSpy = vi.spyOn(http, "request");

    await expect(
      safeRequest(new URL("http://private.example/"), {
        maxBytes: 1024,
        acceptContentTypes: ["text/html"],
        policy: defaultSsrfPolicy(),
      }),
    ).rejects.toMatchObject({ code: "blocked_private_ip" });

    expect(requestSpy).not.toHaveBeenCalled();
  });

  it("uses only the public address from a mixed DNS response", async () => {
    const { url: serverUrl } = await listen((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<html>mixed</html>");
    });

    mockDnsLookup(async () => [
      { address: "10.0.0.1", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ]);

    const url = new URL(`http://mixed.example:${serverUrl.port}/`);
    const response = await safeRequest(url, {
      maxBytes: 1024,
      acceptContentTypes: ["text/html"],
      policy: policyBlockingOnly10(),
    });

    expect(response.status).toBe(200);
    expect(response.body.toString("utf-8")).toContain("mixed");
  });

  it("resolves DNS exactly once per hop and connects on the already-validated address (no rebinding)", async () => {
    const { url: serverUrl } = await listen((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<html>ok</html>");
    });

    let callCount = 0;
    const lookupSpy = mockDnsLookup(async () => {
      callCount++;
      // Any *second* call for this hop would be the DNS-rebinding bug this
      // test guards against; make it obviously wrong (private) so a
      // regression fails loudly instead of by accident succeeding anyway.
      return callCount === 1
        ? [{ address: "127.0.0.1", family: 4 }]
        : [{ address: "10.0.0.1", family: 4 }];
    });

    const url = new URL(`http://rebind.example:${serverUrl.port}/`);
    const response = await safeRequest(url, {
      maxBytes: 1024,
      acceptContentTypes: ["text/html"],
      policy: policyBlockingOnly10(),
    });

    expect(response.status).toBe(200);
    expect(lookupSpy).toHaveBeenCalledTimes(1);
  });

  it("throws blocked_private_ip when a redirect target resolves to a private IP", async () => {
    const { url: redirector } = await listen((_req, res) => {
      res.writeHead(302, { Location: "http://internal.example/" });
      res.end();
    });

    mockDnsLookup(async (hostname) => {
      if (hostname === "internal.example") {
        return [{ address: "10.0.0.1", family: 4 }];
      }
      return [{ address: hostname, family: 4 }];
    });

    await expect(
      safeRequest(redirector, {
        maxBytes: 1024,
        acceptContentTypes: ["text/html"],
        policy: policyBlockingOnly10(),
      }),
    ).rejects.toMatchObject({ code: "blocked_private_ip" });
  });

  it("throws blocked_scheme when a redirect target is a file: URL", async () => {
    const { url: redirector } = await listen((_req, res) => {
      res.writeHead(302, { Location: "file:///etc/passwd" });
      res.end();
    });

    await expect(
      safeRequest(redirector, {
        maxBytes: 1024,
        acceptContentTypes: ["text/html"],
        policy: policyBlockingOnly10(),
      }),
    ).rejects.toMatchObject({ code: "blocked_scheme" });
  });

  it("fails with too_many_redirects after a chain of 4 redirects", async () => {
    const { url } = await listen((req, res) => {
      const match = /\/(\d+)$/.exec(req.url ?? "");
      const step = match ? Number(match[1]) : 0;
      if (step >= 4) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<html>done</html>");
        return;
      }
      res.writeHead(302, { Location: `/${step + 1}` });
      res.end();
    });

    const start = new URL("/0", url);
    await expect(
      safeRequest(start, {
        maxBytes: 1024,
        acceptContentTypes: ["text/html"],
        policy: policyBlockingOnly10(),
        maxRedirects: 3,
      }),
    ).rejects.toMatchObject({ code: "too_many_redirects" });
  });

  it("fails with too_many_redirects on an A -> B -> A redirect loop", async () => {
    const { url } = await listen((req, res) => {
      const next = req.url === "/a" ? "/b" : "/a";
      res.writeHead(302, { Location: next });
      res.end();
    });

    const start = new URL("/a", url);
    await expect(
      safeRequest(start, {
        maxBytes: 1024,
        acceptContentTypes: ["text/html"],
        policy: policyBlockingOnly10(),
      }),
    ).rejects.toMatchObject({ code: "too_many_redirects" });
  });

  it("throws dns_failure when the lookup resolves to an empty address list", async () => {
    mockDnsLookup(async () => []);

    await expect(
      safeRequest(new URL("http://empty.example/"), {
        maxBytes: 1024,
        acceptContentTypes: ["text/html"],
        policy: defaultSsrfPolicy(),
      }),
    ).rejects.toMatchObject({ code: "dns_failure" });
  });

  it("throws dns_failure for NXDOMAIN", async () => {
    const notFound = Object.assign(
      new Error("getaddrinfo ENOTFOUND nxdomain.example"),
      {
        code: "ENOTFOUND",
      },
    );
    mockDnsLookup(() => Promise.reject(notFound));

    await expect(
      safeRequest(new URL("http://nxdomain.example/"), {
        maxBytes: 1024,
        acceptContentTypes: ["text/html"],
        policy: defaultSsrfPolicy(),
      }),
    ).rejects.toMatchObject({ code: "dns_failure" });
  });
});
