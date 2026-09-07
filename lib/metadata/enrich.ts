import { PreviewError, type PreviewErrorCode } from "./errors";
import { assertSafeUrl } from "./ssrf";
import { safeRequest } from "./fetch";
import { extractHeadMetadata, type HeadMetadata } from "./html";
import { processFavicon, processThumbnail, type ProcessedImage } from "./image";
import { logEvent } from "@/lib/security/logging";

/**
 * Pure orchestrator: fetches the page, extracts `<head>` metadata, then
 * fetches/processes its thumbnail and favicon -- composing
 * `lib/metadata/{ssrf,fetch,html,image}.ts` without owning any I/O policy
 * of its own. `enrichOne` NEVER throws/rejects: every internal failure is
 * caught and translated into `{ status: "failed", errorCode }` so the
 * caller (`lib/actions/previews.ts`) can always await it directly.
 *
 * Design decision (thumbnail vs. favicon failure): neither one ever fails
 * the job. A thumbnail/favicon URL that was *found* in the HTML but then
 * fails to fetch/decode -- permanently (e.g. it points at a
 * `blocked_private_ip` host) or transiently -- degrades to `null`: a
 * favicon failure does not bring the job down either, and the
 * title/description/site_name already extracted from the HTML are worth
 * keeping either way, and the item still
 * renders fine with no thumbnail. Not finding a thumbnail/favicon URL at
 * all behaves identically: `status: "ready"` with that field `null`. That
 * silent degradation is still logged via `preview.image_rejected`
 * (`lib/security/logging.ts`) so it stays observable in production --
 * the one piece of I/O this "pure" orchestrator owns.
 *
 * Time budget: every fetch here goes through `safeRequest`, which already
 * carries its own per-call connect/total timeout. Deliberately no extra
 * `AbortController`/wrapping deadline is layered on top -- three
 * sequential `safeRequest` calls (html, thumbnail, favicon) each bounded
 * by their own budget is enough; inventing a second timeout mechanism on
 * top would only add a way for the two to disagree.
 */
export type PreviewJob = { itemId: string; url: string };

export type EnrichOutcome =
  | {
      status: "ready";
      title: string | null;
      description: string | null;
      siteName: string | null;
      thumbnail: ProcessedImage | null;
      thumbnailSource: "og_image" | "twitter_image" | "none";
      favicon: ProcessedImage | null;
    }
  | { status: "failed"; errorCode: PreviewErrorCode };

/** Injection seam for tests -- defaults are the real implementations. */
export type EnrichDeps = {
  safeRequest: typeof safeRequest;
  extractHeadMetadata: typeof extractHeadMetadata;
  processThumbnail: typeof processThumbnail;
  processFavicon: typeof processFavicon;
};

const defaultDeps: EnrichDeps = {
  safeRequest,
  extractHeadMetadata,
  processThumbnail,
  processFavicon,
};

const HTML_MAX_BYTES = 512 * 1024;
const HTML_ACCEPT_CONTENT_TYPES = ["text/html", "application/xhtml+xml"];

const IMAGE_MAX_BYTES = 3 * 1024 * 1024;
// `application/octet-stream`/`binary/octet-stream` are accepted alongside
// the real image MIME types: some hosts (e.g. GitHub's
// repository-images.githubusercontent.com, serving og:image for repo
// cards) mislabel a valid image with a generic binary Content-Type. This
// does not weaken the security gate -- `sniffImageFormat` (image.ts)
// decides purely from magic bytes regardless of what Content-Type said,
// and still rejects SVG/ICO/anything else unrecognized. Exported for
// `__tests__` to assert against directly.
export const IMAGE_ACCEPT_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "application/octet-stream",
  "binary/octet-stream",
];

/** Any exception from the ssrf/fetch layer is already a `PreviewError`; anything else is an unexpected bug. */
function toPreviewErrorCode(error: unknown): PreviewErrorCode {
  if (error instanceof PreviewError) return error.code;
  return "unknown";
}

export async function enrichOne(
  job: PreviewJob,
  deps: EnrichDeps = defaultDeps,
): Promise<EnrichOutcome> {
  try {
    const initialUrl = assertSafeUrl(job.url);

    const htmlResponse = await deps.safeRequest(initialUrl, {
      maxBytes: HTML_MAX_BYTES,
      acceptContentTypes: HTML_ACCEPT_CONTENT_TYPES,
      // Only the `<head>` matters (extractHeadMetadata already bounds
      // itself to the same 512 KiB), so a large HTML document should
      // degrade to "read what we could" instead of failing the whole job.
      truncateOnOverflow: true,
    });

    const html = htmlResponse.body.toString("utf-8");
    const metadata: HeadMetadata = deps.extractHeadMetadata(
      html,
      htmlResponse.finalUrl,
    );

    let thumbnail: ProcessedImage | null = null;
    let thumbnailSource: HeadMetadata["imageSource"] = "none";

    if (metadata.imageUrl) {
      try {
        const imageUrl = assertSafeUrl(metadata.imageUrl);
        const imageResponse = await deps.safeRequest(imageUrl, {
          maxBytes: IMAGE_MAX_BYTES,
          acceptContentTypes: IMAGE_ACCEPT_CONTENT_TYPES,
        });
        thumbnail = await deps.processThumbnail(imageResponse.body);
        thumbnailSource = metadata.imageSource;
      } catch (error) {
        // Thumbnail failures never fail the job either (see class doc
        // comment above) -- keep the title/description already extracted.
        // Still observable, though: this used to be a
        // bare `catch {}` that made `preview.image_rejected` structurally
        // unreachable.
        logEvent({
          event: "preview.image_rejected",
          status: "failure",
          errorClass: toPreviewErrorCode(error),
          entityId: job.itemId,
        });
        thumbnail = null;
        thumbnailSource = "none";
      }
    }

    let favicon: ProcessedImage | null = null;
    if (metadata.iconUrl) {
      try {
        const iconUrl = assertSafeUrl(metadata.iconUrl);
        const iconResponse = await deps.safeRequest(iconUrl, {
          maxBytes: IMAGE_MAX_BYTES,
          acceptContentTypes: IMAGE_ACCEPT_CONTENT_TYPES,
        });
        favicon = await deps.processFavicon(iconResponse.body);
      } catch (error) {
        // Favicon failures never fail the job, but are still
        // observable.
        logEvent({
          event: "preview.image_rejected",
          status: "failure",
          errorClass: toPreviewErrorCode(error),
          entityId: job.itemId,
        });
        favicon = null;
      }
    }

    return {
      status: "ready",
      title: metadata.title,
      description: metadata.description,
      siteName: metadata.siteName,
      thumbnail,
      thumbnailSource,
      favicon,
    };
  } catch (error) {
    return { status: "failed", errorCode: toPreviewErrorCode(error) };
  }
}
