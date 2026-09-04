import { describe, expect, it } from "vitest";

import {
  isPermanent,
  PREVIEW_ERROR_CODES,
  PreviewError,
  type PreviewErrorCode,
} from "@/lib/metadata/errors";

describe("PreviewError", () => {
  it("carries the given code as a typed field", () => {
    const error = new PreviewError("blocked_host");

    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("blocked_host");
    expect(error.name).toBe("PreviewError");
  });

  it("defaults the message to the code when none is given", () => {
    const error = new PreviewError("timeout");
    expect(error.message).toBe("timeout");
  });

  it("accepts a custom message without changing the code", () => {
    const error = new PreviewError("dns_failure", "lookup failed");
    expect(error.code).toBe("dns_failure");
    expect(error.message).toBe("lookup failed");
  });
});

describe("isPermanent", () => {
  const permanentCodes: PreviewErrorCode[] = [
    "blocked_scheme",
    "blocked_host",
    "blocked_private_ip",
    "http_gone",
    "invalid_content_type",
    "image_rejected",
    "decode_failed",
  ];

  const transientCodes: PreviewErrorCode[] = [
    "dns_failure",
    "too_many_redirects",
    "timeout",
    "http_error",
    "too_large",
    "no_image_found",
    "image_fetch_failed",
    "storage_failed",
    "unknown",
  ];

  it.each(permanentCodes)("treats %s as permanent", (code) => {
    expect(isPermanent(code)).toBe(true);
  });

  it.each(transientCodes)("treats %s as transient", (code) => {
    expect(isPermanent(code)).toBe(false);
  });

  it("exhaustively covers every member of PREVIEW_ERROR_CODES without throwing", () => {
    expect(permanentCodes.length + transientCodes.length).toBe(
      PREVIEW_ERROR_CODES.length,
    );
    for (const code of PREVIEW_ERROR_CODES) {
      expect(() => isPermanent(code)).not.toThrow();
      expect(typeof isPermanent(code)).toBe("boolean");
    }
    // Every code in the union is accounted for in exactly one of the two lists.
    const covered = new Set([...permanentCodes, ...transientCodes]);
    expect(covered.size).toBe(PREVIEW_ERROR_CODES.length);
  });
});
