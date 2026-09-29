import { z } from "zod";

import type { ValidationKey } from "@/lib/i18n/validation";

/**
 * Transport ceiling for the raw upload (ADR-017). The browser already
 * shrinks the photo to a 512×512 canvas before `setAvatar` ever sees it --
 * worst case (PNG, no useful compression) lands near 1 MB -- so 2 MB leaves
 * headroom without accepting anything the client didn't already reduce.
 * Depends on `bodySizeLimit` staying >= 2 MB plus multipart overhead;
 * `next.config.ts` currently sets it to 12 MB globally for backup restore.
 */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/**
 * `z.file()` (Zod 4.6.5) validates the `File` instance Node/Next hands back
 * from `FormData.get()` -- no separate check needed for "is this a File".
 * Both the wrong-type and empty-file cases collapse to the same
 * "unsupported format" message: from the user's point of view there's no
 * meaningful difference between picking no file and picking an empty one.
 */
export const avatarFileSchema = z
  .file("avatarUnsupportedFormat" satisfies ValidationKey)
  .min(1, "avatarUnsupportedFormat" satisfies ValidationKey)
  .max(AVATAR_MAX_BYTES, "avatarTooLarge" satisfies ValidationKey);
