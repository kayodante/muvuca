import { BlockList } from "node:net";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import sharp from "sharp";

import { safeRequest } from "@/lib/metadata/fetch";
import { IMAGE_ACCEPT_CONTENT_TYPES } from "@/lib/metadata/enrich";
import { processThumbnail } from "@/lib/metadata/image";
import type { SsrfPolicy } from "@/lib/metadata/ssrf";

/**
 * Covers correction A (`IMAGE_ACCEPT_CONTENT_TYPES` in `enrich.ts` now
 * accepting `application/octet-stream`/`binary/octet-stream`): the real
 * bug was GitHub's `repository-images.githubusercontent.com` serving a
 * valid `og:image` PNG under a generic binary Content-Type, which used to
 * be rejected before `sniffImageFormat` ever saw the bytes. Exercises the
 * real `safeRequest` (fetch.ts) against a local HTTP server -- same
 * pattern as `fetch.test.ts` -- plus the real `processThumbnail`
 * (image.ts), proving the magic-bytes gate is still the one that decides.
 */
function permissivePolicy(): SsrfPolicy {
  return { blockList: new BlockList(), blockedHostnames: new Set() };
}

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

describe("IMAGE_ACCEPT_CONTENT_TYPES", () => {
  it("includes application/octet-stream and binary/octet-stream alongside the real image MIME types", () => {
    expect(IMAGE_ACCEPT_CONTENT_TYPES).toEqual(
      expect.arrayContaining([
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/avif",
        "application/octet-stream",
        "binary/octet-stream",
      ]),
    );
  });

  it("a valid PNG served as binary/octet-stream is accepted by safeRequest and produces a thumbnail", async () => {
    const png = await sharp({
      create: {
        width: 4,
        height: 4,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      .png()
      .toBuffer();

    const { url } = await listen((_req, res) => {
      res.writeHead(200, { "Content-Type": "binary/octet-stream" });
      res.end(png);
    });

    const response = await safeRequest(url, {
      maxBytes: 3 * 1024 * 1024,
      acceptContentTypes: IMAGE_ACCEPT_CONTENT_TYPES,
      policy: permissivePolicy(),
    });

    const thumbnail = await processThumbnail(response.body);
    expect(thumbnail.width).toBe(640);
    expect(thumbnail.height).toBe(360);
  });

  it("non-image bytes served under the same octet-stream Content-Type still fail at sniffImageFormat, not at the Content-Type gate", async () => {
    const notAnImage = Buffer.from(
      "<html><body>not an image</body></html>",
      "utf-8",
    );

    const { url } = await listen((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/octet-stream" });
      res.end(notAnImage);
    });

    const response = await safeRequest(url, {
      maxBytes: 3 * 1024 * 1024,
      acceptContentTypes: IMAGE_ACCEPT_CONTENT_TYPES,
      policy: permissivePolicy(),
    });

    await expect(processThumbnail(response.body)).rejects.toMatchObject({
      code: "image_rejected",
    });
  });
});
