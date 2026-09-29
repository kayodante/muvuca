/**
 * Browser-side crop/resize before `setAvatar()` ever sees the file
 * (ADR-017). This is transport, not a security control -- the server
 * decides the real format by magic byte (`sniffImageFormat()`) and applies
 * its own decoder limits regardless of what this function produces. It
 * exists to shrink a 24 MP iPhone photo, which the server's shared
 * `limitInputPixels` would otherwise reject, down to a canvas the server
 * happily decodes; the upload itself drops from MBs to dozens of KB.
 * `createImageBitmap` also applies EXIF orientation by default, so a
 * portrait photo doesn't arrive sideways.
 */
const AVATAR_CANVAS_SIZE = 512;

/**
 * Decodes `file`, center-crops it to a square and returns a 512x512 blob.
 * Lets a decode failure (HEIC on Chrome desktop, a non-image file) throw --
 * the caller shows the format error before any request reaches the server.
 */
export async function toAvatarUpload(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_CANVAS_SIZE;
    canvas.height = AVATAR_CANVAS_SIZE;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("2d canvas context unavailable");
    }
    context.drawImage(
      bitmap,
      sx,
      sy,
      side,
      side,
      0,
      0,
      AVATAR_CANVAS_SIZE,
      AVATAR_CANVAS_SIZE,
    );

    // Requests WebP; per spec, toBlob falls back to PNG when the browser
    // doesn't support encoding WebP. Either way the server decides the
    // actual format from magic bytes, never from this blob's declared type.
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("canvas toBlob returned null"));
        },
        "image/webp",
        0.9,
      );
    });
  } finally {
    bitmap.close();
  }
}
