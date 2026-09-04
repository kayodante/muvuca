import { describe, expect, it, beforeAll } from "vitest";
import sharp from "sharp";
import { PreviewError } from "../errors";
import { processFavicon, processThumbnail, sniffImageFormat } from "../image";

let pngFixture: Buffer;
let jpegFixture: Buffer;
let webpFixture: Buffer;
let gifFixture: Buffer;
let avifFixture: Buffer;
let truncatedPngFixture: Buffer;
let bombPngFixture: Buffer;

const svgFixture = Buffer.from(
  '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
  "utf-8",
);
// Real ICO magic + header bytes (reserved=0, type=1 icon, 1 image entry).
const icoFixture = Buffer.from([
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x10, 0x10, 0x00, 0x00, 0x01, 0x00, 0x20,
  0x00, 0x68, 0x04, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
]);
const htmlLabeledAsPng = Buffer.from(
  "<html><body>not an image</body></html>",
  "utf-8",
);

beforeAll(async () => {
  const base = sharp({
    create: {
      width: 4,
      height: 4,
      channels: 3,
      background: { r: 200, g: 50, b: 10 },
    },
  });
  pngFixture = await base.clone().png().toBuffer();
  jpegFixture = await base.clone().jpeg().toBuffer();
  webpFixture = await base.clone().webp().toBuffer();
  gifFixture = await base.clone().gif().toBuffer();
  avifFixture = await base.clone().avif().toBuffer();
  truncatedPngFixture = pngFixture.subarray(
    0,
    Math.floor(pngFixture.length / 2),
  );

  // A real "decompression bomb"-shaped PNG: a huge declared pixel count
  // (>24M, our limitInputPixels cap) that compresses to a small file
  // because the pixel data is a single flat color.
  bombPngFixture = await sharp({
    create: {
      width: 6400,
      height: 6300,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();
}, 30000);

describe("sniffImageFormat", () => {
  it("recognizes PNG by magic bytes", () => {
    expect(sniffImageFormat(pngFixture)).toBe("png");
  });

  it("recognizes JPEG by magic bytes", () => {
    expect(sniffImageFormat(jpegFixture)).toBe("jpeg");
  });

  it("recognizes WebP by magic bytes", () => {
    expect(sniffImageFormat(webpFixture)).toBe("webp");
  });

  it("recognizes GIF by magic bytes", () => {
    expect(sniffImageFormat(gifFixture)).toBe("gif");
  });

  it("recognizes AVIF by magic bytes", () => {
    expect(sniffImageFormat(avifFixture)).toBe("avif");
  });

  it("returns null for HTML mislabeled as image/png", () => {
    expect(sniffImageFormat(htmlLabeledAsPng)).toBeNull();
  });

  it("returns null for real SVG bytes even if labeled as an image", () => {
    expect(sniffImageFormat(svgFixture)).toBeNull();
  });

  it("returns null for real ICO bytes even if labeled as an image", () => {
    expect(sniffImageFormat(icoFixture)).toBeNull();
  });
});

describe("processThumbnail", () => {
  it("produces a 640x360 WebP output with a stable sha256 hash", async () => {
    const first = await processThumbnail(pngFixture);
    expect(first.width).toBe(640);
    expect(first.height).toBe(360);
    expect(sniffImageFormat(first.bytes)).toBe("webp");
    expect(first.sha256).toMatch(/^[0-9a-f]{64}$/);

    const second = await processThumbnail(pngFixture);
    expect(second.sha256).toBe(first.sha256);
  });

  it("rejects (never throws synchronously / never crashes) on a truncated PNG", async () => {
    await expect(processThumbnail(truncatedPngFixture)).rejects.toBeInstanceOf(
      Error,
    );
  });

  it("rejects a decompression-bomb-shaped PNG exceeding the pixel limit", async () => {
    await expect(processThumbnail(bombPngFixture)).rejects.toBeInstanceOf(
      Error,
    );
  });

  it("rejects content that isn't a recognized image format with a PreviewError(image_rejected)", async () => {
    const error: unknown = await processThumbnail(htmlLabeledAsPng).catch(
      (caught) => caught,
    );
    expect(error).toBeInstanceOf(PreviewError);
    expect((error as PreviewError).code).toBe("image_rejected");
  });
});

describe("processFavicon", () => {
  it("produces a 64x64 WebP output", async () => {
    const result = await processFavicon(jpegFixture);
    expect(result.width).toBe(64);
    expect(result.height).toBe(64);
    expect(sniffImageFormat(result.bytes)).toBe("webp");
  });
});
