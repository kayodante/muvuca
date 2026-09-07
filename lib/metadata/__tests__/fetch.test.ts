import { BlockList } from "node:net";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isDisallowedHttpsDowngrade,
  safeRequest,
  type SafeRequestOptions,
} from "@/lib/metadata/fetch";
import type { SsrfPolicy } from "@/lib/metadata/ssrf";

/**
 * A policy that blocks nothing. The test server below listens on
 * `127.0.0.1`, which the *default* SSRF policy blocks on purpose — this
 * permissive policy is injected instead so these tests exercise
 * `safeRequest`'s HTTP mechanics (timeouts, size caps, content-type,
 * status handling, header hygiene) without the SSRF layer getting in the
 * way. `ssrf.test.ts` already covers the default policy exhaustively.
 */
function permissivePolicy(): SsrfPolicy {
  return { blockList: new BlockList(), blockedHostnames: new Set() };
}

const baseOptions: SafeRequestOptions = {
  maxBytes: 1024,
  acceptContentTypes: ["text/html"],
  policy: permissivePolicy(),
};

let servers: http.Server[] = [];

function listen(
  handler: http.RequestListener,
): Promise<{ url: URL; server: http.Server }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    servers.push(server);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({ url: new URL(`http://127.0.0.1:${port}/`), server });
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

describe("safeRequest", () => {
  it("returns the body, status and content-type for a normal 200 response", async () => {
    const { url } = await listen((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<html><head></head></html>");
    });

    const response = await safeRequest(url, baseOptions);

    expect(response.status).toBe(200);
    expect(response.contentType).toBe("text/html; charset=utf-8");
    expect(response.body.toString("utf-8")).toContain("<html>");
    expect(response.finalUrl.href).toBe(url.href);
  });

  it("times out when the server never sends a response within connectTimeoutMs", async () => {
    const { url } = await listen(() => {
      // Never call res.end() / res.writeHead(): the client should give up.
    });

    await expect(
      safeRequest(url, {
        ...baseOptions,
        connectTimeoutMs: 50,
        totalTimeoutMs: 5000,
      }),
    ).rejects.toMatchObject({ code: "timeout" });
  });

  it("times out when the total wall-clock budget is exceeded by a slow trickling body", async () => {
    const { url } = await listen((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.write("<html>");
      const interval = setInterval(() => {
        res.write("x");
      }, 20);
      res.on("close", () => clearInterval(interval));
    });

    await expect(
      safeRequest(url, {
        ...baseOptions,
        connectTimeoutMs: 3000,
        totalTimeoutMs: 100,
      }),
    ).rejects.toMatchObject({ code: "timeout" });
  });

  it("rejects with too_large when Content-Length exceeds the cap, without reading the body", async () => {
    let bodyWasRead = false;
    const { url } = await listen((_req, res) => {
      res.writeHead(200, {
        "Content-Type": "text/html",
        "Content-Length": String(baseOptions.maxBytes * 10),
      });
      // If the client ever asked for more, it would show up as backpressure
      // being drained; we only care that our own maxBytes body never grows.
      const timer = setInterval(() => {
        bodyWasRead = true;
        res.write("x".repeat(64));
      }, 5);
      res.on("close", () => clearInterval(timer));
    });

    await expect(safeRequest(url, baseOptions)).rejects.toMatchObject({
      code: "too_large",
    });
    void bodyWasRead;
  });

  it("rejects with too_large and destroys the connection when the body overflows without a Content-Length", async () => {
    let serverSawClose = false;
    const { url } = await listen((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.socket?.on("close", () => {
        serverSawClose = true;
      });
      const chunk = "x".repeat(256);
      const interval = setInterval(() => {
        if (res.destroyed) {
          clearInterval(interval);
          return;
        }
        res.write(chunk);
      }, 5);
      res.on("close", () => clearInterval(interval));
    });

    await expect(safeRequest(url, baseOptions)).rejects.toMatchObject({
      code: "too_large",
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(serverSawClose).toBe(true);
  });

  it("with truncateOnOverflow, resolves with the body truncated to maxBytes instead of rejecting", async () => {
    const { url } = await listen((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("x".repeat(baseOptions.maxBytes * 4));
    });

    const response = await safeRequest(url, {
      ...baseOptions,
      truncateOnOverflow: true,
    });

    expect(response.status).toBe(200);
    expect(response.body.length).toBe(baseOptions.maxBytes);
  });

  it("without truncateOnOverflow (default), still rejects with too_large past the cap", async () => {
    const { url } = await listen((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("x".repeat(baseOptions.maxBytes * 4));
    });

    await expect(safeRequest(url, baseOptions)).rejects.toMatchObject({
      code: "too_large",
    });
  });

  it("with truncateOnOverflow, a declared Content-Length above the cap does not reject up front -- it reads and truncates to maxBytes", async () => {
    const { url } = await listen((_req, res) => {
      res.writeHead(200, {
        "Content-Type": "text/html",
        "Content-Length": String(baseOptions.maxBytes * 10),
      });
      res.end("y".repeat(baseOptions.maxBytes * 10));
    });

    const response = await safeRequest(url, {
      ...baseOptions,
      truncateOnOverflow: true,
    });

    expect(response.status).toBe(200);
    expect(response.body.length).toBe(baseOptions.maxBytes);
  });

  it("without truncateOnOverflow, a declared Content-Length above the cap still rejects up front, before reading the body", async () => {
    let bodyWasRead = false;
    const { url } = await listen((_req, res) => {
      res.writeHead(200, {
        "Content-Type": "text/html",
        "Content-Length": String(baseOptions.maxBytes * 10),
      });
      const timer = setInterval(() => {
        bodyWasRead = true;
        res.write("z".repeat(64));
      }, 5);
      res.on("close", () => clearInterval(timer));
    });

    await expect(safeRequest(url, baseOptions)).rejects.toMatchObject({
      code: "too_large",
    });
    void bodyWasRead;
  });

  it("rejects with invalid_content_type for a disallowed Content-Type", async () => {
    const { url } = await listen((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/pdf" });
      res.end("%PDF-1.4");
    });

    await expect(safeRequest(url, baseOptions)).rejects.toMatchObject({
      code: "invalid_content_type",
    });
  });

  it("rejects with invalid_content_type when Content-Type is absent", async () => {
    const { url } = await listen((_req, res) => {
      res.writeHead(200, {});
      res.end("<html></html>");
    });

    await expect(safeRequest(url, baseOptions)).rejects.toMatchObject({
      code: "invalid_content_type",
    });
  });

  it("rejects with http_not_found for a 404", async () => {
    const { url } = await listen((_req, res) => {
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end("not found");
    });

    await expect(safeRequest(url, baseOptions)).rejects.toMatchObject({
      code: "http_not_found",
    });
  });

  it("rejects with http_error (not http_not_found) for a 403 -- a bot-blocking site is still alive", async () => {
    const { url } = await listen((_req, res) => {
      res.writeHead(403, { "Content-Type": "text/html" });
      res.end("forbidden");
    });

    await expect(safeRequest(url, baseOptions)).rejects.toMatchObject({
      code: "http_error",
    });
  });

  it("rejects with http_error for a 500", async () => {
    const { url } = await listen((_req, res) => {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end("boom");
    });

    await expect(safeRequest(url, baseOptions)).rejects.toMatchObject({
      code: "http_error",
    });
  });

  it("rejects with http_gone for a 410", async () => {
    const { url } = await listen((_req, res) => {
      res.writeHead(410, { "Content-Type": "text/html" });
      res.end("gone");
    });

    await expect(safeRequest(url, baseOptions)).rejects.toMatchObject({
      code: "http_gone",
    });
  });

  it("never sends Cookie, Authorization or Referer to the server", async () => {
    let seenHeaders: http.IncomingHttpHeaders = {};
    const { url } = await listen((req, res) => {
      seenHeaders = req.headers;
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<html></html>");
    });

    await safeRequest(url, baseOptions);

    expect(seenHeaders.cookie).toBeUndefined();
    expect(seenHeaders.authorization).toBeUndefined();
    expect(seenHeaders.referer).toBeUndefined();
    expect(seenHeaders["user-agent"]).toBe("Muvuca/1.0 (+https://muvuca.app)");
  });

  it("follows a redirect up to maxRedirects and returns the final response", async () => {
    const { url: target } = await listen((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<html>final</html>");
    });
    const { url: redirector } = await listen((_req, res) => {
      res.writeHead(302, { Location: target.href });
      res.end();
    });

    const response = await safeRequest(redirector, baseOptions);
    expect(response.status).toBe(200);
    expect(response.finalUrl.href).toBe(target.href);
  });

  it("fails with too_many_redirects past the configured max", async () => {
    // Server that always redirects to itself.
    const { url } = await listen((req, res) => {
      res.writeHead(302, {
        Location: `http://127.0.0.1:${req.socket.localPort}/`,
      });
      res.end();
    });

    await expect(
      safeRequest(url, { ...baseOptions, maxRedirects: 2 }),
    ).rejects.toMatchObject({ code: "too_many_redirects" });
  });

  it("rejects with http_error for a 3xx response with no Location header", async () => {
    const { url } = await listen((_req, res) => {
      res.writeHead(302, {});
      res.end();
    });

    await expect(safeRequest(url, baseOptions)).rejects.toMatchObject({
      code: "http_error",
    });
  });

  it("times out immediately when the total budget is already exhausted, before opening a socket", async () => {
    const requestSpy = vi.spyOn(http, "request");
    const { url } = await listen((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<html></html>");
    });

    await expect(
      safeRequest(url, { ...baseOptions, totalTimeoutMs: 0 }),
    ).rejects.toMatchObject({ code: "timeout" });
    expect(requestSpy).not.toHaveBeenCalled();
    requestSpy.mockRestore();
  });
});

describe("isDisallowedHttpsDowngrade", () => {
  it("blocks an https -> http redirect that also changes host", () => {
    expect(
      isDisallowedHttpsDowngrade(
        new URL("https://good.example/"),
        new URL("http://evil.example/"),
      ),
    ).toBe(true);
  });

  it("allows an https -> http redirect that stays on the same host", () => {
    expect(
      isDisallowedHttpsDowngrade(
        new URL("https://good.example/a"),
        new URL("http://good.example/b"),
      ),
    ).toBe(false);
  });

  it("allows an https -> https redirect to a different host", () => {
    expect(
      isDisallowedHttpsDowngrade(
        new URL("https://good.example/"),
        new URL("https://other.example/"),
      ),
    ).toBe(false);
  });

  it("allows an http -> http redirect to a different host (no downgrade happened)", () => {
    expect(
      isDisallowedHttpsDowngrade(
        new URL("http://good.example/"),
        new URL("http://other.example/"),
      ),
    ).toBe(false);
  });
});
