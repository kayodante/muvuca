import { createHash } from "node:crypto";
import sharp from "sharp";

import { PreviewError } from "./errors";

/**
 * Image-processing half of the link-preview pipeline. Standalone
 * over `sharp` -- it does not import anything from `ssrf.ts`/`fetch.ts`,
 * only the shared `PreviewError`/`PreviewErrorCode` contract from
 * `errors.ts` so every rejection this module raises already carries a
 * closed-union code, exactly like the rest of `lib/metadata/` -- never a
 * bare `Error`, which would break that contract.
 *
 * `sniffImageFormat` is the security-relevant piece: it decides purely from
 * magic bytes, never from a server-supplied `Content-Type`, so a
 * mislabeled response can't reach `sharp` under a false pretense. SVG and
 * ICO are deliberately never recognized here -- SVG can carry script
 * content even when only rasterized, and ICO parsers have a history of
 * memory-safety CVEs -- so both fall through to `null` exactly like any
 * other unrecognized byte stream, with no special-casing needed.
 */
export type ImageFormat = "jpeg" | "png" | "webp" | "gif" | "avif";

export type ProcessedImage = {
  bytes: Buffer;
  width: number;
  height: number;
  sha256: string;
};

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const GIF87_MAGIC = Buffer.from("GIF87a", "ascii");
const GIF89_MAGIC = Buffer.from("GIF89a", "ascii");

export function sniffImageFormat(bytes: Buffer): ImageFormat | null {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(PNG_MAGIC)) {
    return "png";
  }
  if (bytes.length >= 3 && bytes.subarray(0, 3).equals(JPEG_MAGIC)) {
    return "jpeg";
  }
  if (
    bytes.length >= 6 &&
    (bytes.subarray(0, 6).equals(GIF87_MAGIC) ||
      bytes.subarray(0, 6).equals(GIF89_MAGIC))
  ) {
    return "gif";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  if (bytes.length >= 12 && bytes.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = bytes.subarray(8, 12).toString("ascii");
    if (brand === "avif" || brand === "avis") {
      return "avif";
    }
  }
  return null;
}

/**
 * Hard pixel-count cap passed to `sharp`'s own `limitInputPixels` -- the
 * single line of defense against a "decompression bomb" image that
 * declares enormous dimensions in a tiny, highly compressible file.
 * `sharp` rejects (never crashes/hangs the process) once the
 * declared or decoded pixel count exceeds this.
 *
 * Interacts with `DRAIN_CONCURRENCY` (`lib/actions/previews.ts`): worst
 * case is this many px × 4 bytes/px × `DRAIN_CONCURRENCY` concurrent
 * decodes in one invocation -- 24M × 4 × 3 ≈ 288 MB of decode buffers.
 * Chosen against a default 1024 MB serverless function memory ceiling
 * (the project does not raise this default), leaving headroom
 * for the Node runtime itself plus the `IMAGE_MAX_BYTES` (3 MB) download
 * buffer per job. 24 megapixels still comfortably covers every legitimate
 * preview image (OG images are typically under 2 MP; even an uncropped
 * high-end camera photo tops out around this cap) -- only a file crafted
 * to declare far more pixels than its byte size could plausibly hold gets
 * rejected -- a higher cap like 40M would be closer to a 1 GB peak than a
 * safety margin.
 */
const MAX_INPUT_PIXELS = 24_000_000;
const WEBP_QUALITY = 72;

/** Avoids referencing the `sharp` ambient namespace's `Sharp` type directly (see `import sharp from "sharp"` above). */
type SharpInstance = ReturnType<typeof sharp>;

async function process(
  bytes: Buffer,
  resize: (image: SharpInstance) => SharpInstance,
): Promise<ProcessedImage> {
  if (sniffImageFormat(bytes) === null) {
    throw new PreviewError("image_rejected", "unrecognized_image_format");
  }

  const pipeline = resize(
    sharp(bytes, {
      limitInputPixels: MAX_INPUT_PIXELS,
      failOn: "error",
      animated: false,
    }),
  ).webp({ quality: WEBP_QUALITY });

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

  return {
    bytes: data,
    width: info.width,
    height: info.height,
    sha256: createHash("sha256").update(data).digest("hex"),
  };
}

/** 640×360 cover crop, re-encoded as WebP quality 72. */
export async function processThumbnail(bytes: Buffer): Promise<ProcessedImage> {
  return process(bytes, (image) =>
    image.resize(640, 360, { fit: "cover", withoutEnlargement: false }),
  );
}

/** 64×64 contain (transparent letterbox), re-encoded as WebP quality 72. */
export async function processFavicon(bytes: Buffer): Promise<ProcessedImage> {
  return process(bytes, (image) =>
    image.resize(64, 64, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    }),
  );
}
