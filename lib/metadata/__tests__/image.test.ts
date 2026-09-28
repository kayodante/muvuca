import { createHash } from "node:crypto";
import { describe, expect, it, beforeAll } from "vitest";
import sharp from "sharp";
import { PreviewError } from "../errors";
import {
  processAvatar,
  processFavicon,
  processThumbnail,
  sniffImageFormat,
} from "../image";

let pngFixture: Buffer;
let jpegFixture: Buffer;
let webpFixture: Buffer;
let gifFixture: Buffer;
let avifFixture: Buffer;
let truncatedPngFixture: Buffer;
let bombPngFixture: Buffer;
let exifGpsJpegFixture: Buffer;
let orientedJpegFixture: Buffer;
let animatedGifFixture: Buffer;

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

  // JPEG carrying EXIF (with GPS in IFD3) + an ICC profile + XMP, to prove
  // processAvatar's re-encode strips all three (ADR-017).
  exifGpsJpegFixture = await base
    .clone()
    .withExif({
      IFD0: { Copyright: "x", ImageDescription: "secret" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "22/1 54/1 0/1" },
    })
    .withIccProfile("srgb")
    .withXmp(
      '<?xpacket begin="?><x:xmpmeta xmlns:x="adobe:ns:meta/"></x:xmpmeta><?xpacket end="w"?>',
    )
    .jpeg()
    .toBuffer();

  // 200x100 JPEG, top half red / bottom half blue, tagged EXIF
  // Orientation=6 (rotate 90deg CW to display upright). Used to prove
  // autoOrient() runs before resize.
  const topHalf = await sharp({
    create: {
      width: 200,
      height: 50,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .raw()
    .toBuffer();
  const bottomHalf = await sharp({
    create: {
      width: 200,
      height: 50,
      channels: 3,
      background: { r: 0, g: 0, b: 255 },
    },
  })
    .raw()
    .toBuffer();
  orientedJpegFixture = await sharp(Buffer.concat([topHalf, bottomHalf]), {
    raw: { width: 200, height: 100, channels: 3 },
  })
    .withMetadata({ orientation: 6 })
    .jpeg()
    .toBuffer();

  // 2-frame animated GIF, to prove processAvatar collapses it to one frame.
  const frameA = await sharp({
    create: {
      width: 8,
      height: 8,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();
  const frameB = await sharp({
    create: {
      width: 8,
      height: 8,
      channels: 3,
      background: { r: 0, g: 0, b: 255 },
    },
  })
    .png()
    .toBuffer();
  animatedGifFixture = await sharp([frameA, frameB], {
    join: { animated: true },
  })
    .gif()
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

describe("processAvatar", () => {
  it("produces a 256x256 WebP output with a correct sha256 hash", async () => {
    const result = await processAvatar(jpegFixture);
    expect(result.width).toBe(256);
    expect(result.height).toBe(256);
    expect(sniffImageFormat(result.bytes)).toBe("webp");
    expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(result.sha256).toBe(
      createHash("sha256").update(result.bytes).digest("hex"),
    );
  });

  it("strips EXIF (including GPS), XMP and ICC from a JPEG that has them", async () => {
    // Positive control: the fixture actually carries the metadata we're
    // about to assert gets stripped -- otherwise this test would pass
    // trivially.
    const inputMeta = await sharp(exifGpsJpegFixture).metadata();
    expect(inputMeta.exif).toBeDefined();
    expect(inputMeta.icc).toBeDefined();
    expect(inputMeta.xmp).toBeDefined();

    const result = await processAvatar(exifGpsJpegFixture);
    const outputMeta = await sharp(result.bytes).metadata();
    expect(outputMeta.exif).toBeUndefined();
    expect(outputMeta.xmp).toBeUndefined();
    expect(outputMeta.icc).toBeUndefined();
  });

  it("applies EXIF Orientation=6 before cropping (autoOrient)", async () => {
    // Positive control: the fixture is really tagged Orientation=6 before
    // any processing.
    const inputMeta = await sharp(orientedJpegFixture).metadata();
    expect(inputMeta.orientation).toBe(6);

    const result = await processAvatar(orientedJpegFixture);
    const { data, info } = await sharp(result.bytes)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixelAt = (x: number, y: number): [number, number, number] => {
      const i = (y * info.width + x) * info.channels;
      return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0];
    };
    // Orientation=6 rotates 90deg clockwise for display: the original top
    // (red) half ends up on the right, the bottom (blue) half on the left.
    // JPEG re-encoding is lossy, so compare dominant channel rather than
    // exact 0/255 values.
    const [topLeftR, , topLeftB] = pixelAt(10, 10);
    const [topRightR, , topRightB] = pixelAt(245, 10);
    expect(topLeftB).toBeGreaterThan(topLeftR);
    expect(topRightR).toBeGreaterThan(topRightB);

    // Negative control: without autoOrient, resize/cover reads the raw
    // (unrotated) pixel grid, so the top-left quadrant would be red instead
    // of blue. This proves the assertions above would fail if autoOrient
    // were removed from processAvatar.
    const withoutAutoOrient = await sharp(orientedJpegFixture)
      .resize(256, 256, { fit: "cover" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const controlPixelAt = (x: number, y: number): [number, number, number] => {
      const i =
        (y * withoutAutoOrient.info.width + x) *
        withoutAutoOrient.info.channels;
      return [
        withoutAutoOrient.data[i] ?? 0,
        withoutAutoOrient.data[i + 1] ?? 0,
        withoutAutoOrient.data[i + 2] ?? 0,
      ];
    };
    const [controlR, , controlB] = controlPixelAt(10, 10);
    expect(controlR).toBeGreaterThan(controlB);
  });

  it("rejects SVG with a PreviewError(image_rejected)", async () => {
    const error: unknown = await processAvatar(svgFixture).catch(
      (caught) => caught,
    );
    expect(error).toBeInstanceOf(PreviewError);
    expect((error as PreviewError).code).toBe("image_rejected");
  });

  it("rejects ICO with a PreviewError(image_rejected)", async () => {
    const error: unknown = await processAvatar(icoFixture).catch(
      (caught) => caught,
    );
    expect(error).toBeInstanceOf(PreviewError);
    expect((error as PreviewError).code).toBe("image_rejected");
  });

  it("rejects HTML renamed to look like an image with a PreviewError(image_rejected)", async () => {
    const error: unknown = await processAvatar(htmlLabeledAsPng).catch(
      (caught) => caught,
    );
    expect(error).toBeInstanceOf(PreviewError);
    expect((error as PreviewError).code).toBe("image_rejected");
  });

  it("rejects a polyglot with a non-image prefix with a PreviewError(image_rejected)", async () => {
    const polyglot = Buffer.concat([
      Buffer.from("<html><script>alert(1)</script>"),
      jpegFixture,
    ]);
    const error: unknown = await processAvatar(polyglot).catch(
      (caught) => caught,
    );
    expect(error).toBeInstanceOf(PreviewError);
    expect((error as PreviewError).code).toBe("image_rejected");
  });

  it("decodes a polyglot with valid leading magic bytes but drops the trailing payload", async () => {
    // Real JPEG magic bytes lead, so sniffImageFormat/sharp accept it -- but
    // the output is generated by libwebp from decoded pixels, so no byte of
    // the appended payload survives.
    const payload = Buffer.from("<script>alert(1)</script>");
    const polyglot = Buffer.concat([jpegFixture, payload]);

    const result = await processAvatar(polyglot);
    expect(sniffImageFormat(result.bytes)).toBe("webp");
    expect(result.bytes.includes(payload)).toBe(false);
  });

  it("rejects a decompression-bomb-shaped PNG exceeding the pixel limit", async () => {
    await expect(processAvatar(bombPngFixture)).rejects.toBeInstanceOf(Error);
  });

  it("collapses an animated GIF to a single 256x256 frame", async () => {
    // Positive control: the fixture really has 2+ frames.
    const inputMeta = await sharp(animatedGifFixture, {
      animated: true,
    }).metadata();
    expect(inputMeta.pages).toBeGreaterThanOrEqual(2);

    const result = await processAvatar(animatedGifFixture);
    const outputMeta = await sharp(result.bytes).metadata();
    expect(outputMeta.pages === undefined || outputMeta.pages === 1).toBe(true);
    expect(result.width).toBe(256);
    expect(result.height).toBe(256);
  });
});
