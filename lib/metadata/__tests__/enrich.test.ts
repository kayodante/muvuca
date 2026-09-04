import { beforeEach, describe, expect, it, vi } from "vitest";

const { logEventMock } = vi.hoisted(() => ({ logEventMock: vi.fn() }));
vi.mock("@/lib/security/logging", () => ({ logEvent: logEventMock }));

import { enrichOne, type EnrichDeps } from "../enrich";
import { PREVIEW_ERROR_CODES, PreviewError } from "../errors";
import type { HeadMetadata } from "../html";
import type { SafeResponse } from "../fetch";
import type { ProcessedImage } from "../image";

const JOB = { itemId: "item-1", url: "https://example.com/article" };

function htmlResponse(overrides: Partial<SafeResponse> = {}): SafeResponse {
  return {
    status: 200,
    contentType: "text/html",
    body: Buffer.from("<html></html>"),
    finalUrl: new URL("https://example.com/article"),
    ...overrides,
  };
}

function metadata(overrides: Partial<HeadMetadata> = {}): HeadMetadata {
  return {
    title: "Title",
    description: "Description",
    siteName: "Example",
    imageUrl: null,
    imageSource: "none",
    iconUrl: null,
    ...overrides,
  };
}

function processedImage(
  overrides: Partial<ProcessedImage> = {},
): ProcessedImage {
  return {
    bytes: Buffer.from("webp-bytes"),
    width: 640,
    height: 360,
    sha256: "a".repeat(64),
    ...overrides,
  };
}

function baseDeps(overrides: Partial<EnrichDeps> = {}): EnrichDeps {
  return {
    safeRequest: vi.fn().mockResolvedValue(htmlResponse()),
    extractHeadMetadata: vi.fn().mockReturnValue(metadata()),
    processThumbnail: vi.fn().mockResolvedValue(processedImage()),
    processFavicon: vi
      .fn()
      .mockResolvedValue(processedImage({ width: 64, height: 64 })),
    ...overrides,
  };
}

describe("enrichOne", () => {
  beforeEach(() => {
    logEventMock.mockClear();
  });

  it("never throws for an invalid job URL", async () => {
    const deps = baseDeps();
    const outcome = await enrichOne({ itemId: "x", url: "not a url" }, deps);
    expect(outcome.status).toBe("failed");
    if (outcome.status === "failed") {
      expect(PREVIEW_ERROR_CODES).toContain(outcome.errorCode);
    }
  });

  it("never throws when safeRequest rejects for the HTML fetch", async () => {
    const deps = baseDeps({
      safeRequest: vi.fn().mockRejectedValue(new PreviewError("timeout")),
    });
    const outcome = await enrichOne(JOB, deps);
    expect(outcome).toEqual({ status: "failed", errorCode: "timeout" });
  });

  it("never throws when safeRequest rejects with a non-PreviewError", async () => {
    const deps = baseDeps({
      safeRequest: vi.fn().mockRejectedValue(new Error("boom")),
    });
    const outcome = await enrichOne(JOB, deps);
    expect(outcome.status).toBe("failed");
    if (outcome.status === "failed") {
      expect(outcome.errorCode).toBe("unknown");
    }
  });

  it("never throws when extractHeadMetadata throws synchronously", async () => {
    const deps = baseDeps({
      extractHeadMetadata: vi.fn().mockImplementation(() => {
        throw new Error("parse blew up");
      }),
    });
    const outcome = await enrichOne(JOB, deps);
    expect(outcome.status).toBe("failed");
    if (outcome.status === "failed") {
      expect(PREVIEW_ERROR_CODES).toContain(outcome.errorCode);
    }
  });

  it("does not fail the job when the declared image fetch rejects transiently (e.g. http_error) -- keeps title/description, thumbnail: null", async () => {
    const deps = baseDeps({
      extractHeadMetadata: vi.fn().mockReturnValue(
        metadata({
          imageUrl: "https://example.com/og.png",
          imageSource: "og_image",
        }),
      ),
      safeRequest: vi
        .fn()
        .mockResolvedValueOnce(htmlResponse())
        .mockRejectedValueOnce(new PreviewError("http_error")),
    });
    const outcome = await enrichOne(JOB, deps);
    expect(outcome).toEqual({
      status: "ready",
      title: "Title",
      description: "Description",
      siteName: "Example",
      thumbnail: null,
      thumbnailSource: "none",
      favicon: null,
    });
    // Final review I-3: a swallowed thumbnail failure is still observable.
    expect(logEventMock).toHaveBeenCalledWith({
      event: "preview.image_rejected",
      status: "failure",
      errorClass: "http_error",
      entityId: JOB.itemId,
    });
  });

  it("does not fail the job when the declared image fetch rejects with a permanent SSRF block (e.g. blocked_private_ip) -- keeps title/description, thumbnail: null", async () => {
    const deps = baseDeps({
      extractHeadMetadata: vi.fn().mockReturnValue(
        metadata({
          imageUrl: "https://example.com/og.png",
          imageSource: "og_image",
        }),
      ),
      safeRequest: vi
        .fn()
        .mockResolvedValueOnce(htmlResponse())
        .mockRejectedValueOnce(new PreviewError("blocked_private_ip")),
    });
    const outcome = await enrichOne(JOB, deps);
    expect(outcome.status).toBe("ready");
    if (outcome.status === "ready") {
      expect(outcome.title).toBe("Title");
      expect(outcome.description).toBe("Description");
      expect(outcome.thumbnail).toBeNull();
      expect(outcome.thumbnailSource).toBe("none");
    }
  });

  it("does not fail the job when processThumbnail rejects with an unrecognized format", async () => {
    const deps = baseDeps({
      extractHeadMetadata: vi.fn().mockReturnValue(
        metadata({
          imageUrl: "https://example.com/og.png",
          imageSource: "og_image",
        }),
      ),
      processThumbnail: vi
        .fn()
        .mockRejectedValue(new Error("unrecognized_image_format")),
    });
    const outcome = await enrichOne(JOB, deps);
    expect(outcome.status).toBe("ready");
    if (outcome.status === "ready") {
      expect(outcome.thumbnail).toBeNull();
      expect(outcome.thumbnailSource).toBe("none");
    }
  });

  it("does not fail the job when processThumbnail rejects for any other reason (decode failure)", async () => {
    const deps = baseDeps({
      extractHeadMetadata: vi.fn().mockReturnValue(
        metadata({
          imageUrl: "https://example.com/og.png",
          imageSource: "og_image",
        }),
      ),
      processThumbnail: vi.fn().mockRejectedValue(new Error("bad vips input")),
    });
    const outcome = await enrichOne(JOB, deps);
    expect(outcome.status).toBe("ready");
    if (outcome.status === "ready") {
      expect(outcome.thumbnail).toBeNull();
      expect(outcome.thumbnailSource).toBe("none");
    }
  });

  it("does not fail the job when the favicon fetch rejects", async () => {
    const deps = baseDeps({
      extractHeadMetadata: vi
        .fn()
        .mockReturnValue(
          metadata({ iconUrl: "https://example.com/favicon.png" }),
        ),
      safeRequest: vi
        .fn()
        .mockResolvedValueOnce(htmlResponse())
        .mockRejectedValueOnce(new PreviewError("http_error")),
    });
    const outcome = await enrichOne(JOB, deps);
    expect(outcome.status).toBe("ready");
    if (outcome.status === "ready") {
      expect(outcome.favicon).toBeNull();
    }
    // Final review I-3: a swallowed favicon fetch failure is still logged.
    expect(logEventMock).toHaveBeenCalledWith({
      event: "preview.image_rejected",
      status: "failure",
      errorClass: "http_error",
      entityId: JOB.itemId,
    });
  });

  it("does not fail the job when processFavicon rejects", async () => {
    const deps = baseDeps({
      extractHeadMetadata: vi
        .fn()
        .mockReturnValue(
          metadata({ iconUrl: "https://example.com/favicon.png" }),
        ),
      processFavicon: vi.fn().mockRejectedValue(new Error("decode error")),
    });
    const outcome = await enrichOne(JOB, deps);
    expect(outcome.status).toBe("ready");
    if (outcome.status === "ready") {
      expect(outcome.favicon).toBeNull();
    }
    // A non-PreviewError rejection still normalizes to "unknown" via the
    // same toPreviewErrorCode() helper the top-level catch uses.
    expect(logEventMock).toHaveBeenCalledWith({
      event: "preview.image_rejected",
      status: "failure",
      errorClass: "unknown",
      entityId: JOB.itemId,
    });
  });

  it("returns ready with thumbnail: null when no image is found (not a failure)", async () => {
    const deps = baseDeps({
      extractHeadMetadata: vi
        .fn()
        .mockReturnValue(metadata({ imageUrl: null })),
    });
    const outcome = await enrichOne(JOB, deps);
    expect(outcome).toEqual({
      status: "ready",
      title: "Title",
      description: "Description",
      siteName: "Example",
      thumbnail: null,
      thumbnailSource: "none",
      favicon: null,
    });
  });

  it("returns ready with thumbnail and favicon populated on full success", async () => {
    const thumb = processedImage({ sha256: "b".repeat(64) });
    const icon = processedImage({
      width: 64,
      height: 64,
      sha256: "c".repeat(64),
    });
    const deps = baseDeps({
      extractHeadMetadata: vi.fn().mockReturnValue(
        metadata({
          imageUrl: "https://example.com/og.png",
          imageSource: "og_image",
          iconUrl: "https://example.com/favicon.png",
        }),
      ),
      processThumbnail: vi.fn().mockResolvedValue(thumb),
      processFavicon: vi.fn().mockResolvedValue(icon),
    });
    const outcome = await enrichOne(JOB, deps);
    expect(outcome.status).toBe("ready");
    if (outcome.status === "ready") {
      expect(outcome.thumbnail).toEqual(thumb);
      expect(outcome.thumbnailSource).toBe("og_image");
      expect(outcome.favicon).toEqual(icon);
    }
  });

  it("uses twitter_image as thumbnailSource when that's what was found", async () => {
    const deps = baseDeps({
      extractHeadMetadata: vi.fn().mockReturnValue(
        metadata({
          imageUrl: "https://example.com/tw.png",
          imageSource: "twitter_image",
        }),
      ),
    });
    const outcome = await enrichOne(JOB, deps);
    expect(outcome.status).toBe("ready");
    if (outcome.status === "ready") {
      expect(outcome.thumbnailSource).toBe("twitter_image");
    }
  });
});
