import { describe, expect, it } from "vitest";
import {
  DEFAULT_REDIRECT,
  redirectTargetSchema,
  safeRedirectTarget,
} from "@/lib/security/redirects";

describe("redirectTargetSchema", () => {
  it("accepts a plain relative path", () => {
    expect(redirectTargetSchema.safeParse("/library").success).toBe(true);
  });

  it("accepts a relative path with a query string", () => {
    expect(redirectTargetSchema.safeParse("/tags/abc?rollup=0").success).toBe(
      true,
    );
  });

  it("rejects a protocol-relative target", () => {
    expect(redirectTargetSchema.safeParse("//evil.example").success).toBe(
      false,
    );
  });

  it("rejects a backslash target (browsers treat \\ as /)", () => {
    expect(redirectTargetSchema.safeParse("/\\evil.example").success).toBe(
      false,
    );
  });

  it("rejects an absolute URL with a scheme", () => {
    expect(redirectTargetSchema.safeParse("https://evil.example").success).toBe(
      false,
    );
  });

  it("rejects a target that doesn't start with a slash", () => {
    expect(redirectTargetSchema.safeParse("library").success).toBe(false);
  });

  it("rejects embedded whitespace/control characters", () => {
    expect(
      redirectTargetSchema.safeParse("/library\nSet-Cookie: x").success,
    ).toBe(false);
  });
});

describe("safeRedirectTarget", () => {
  it("returns the value when it is a valid relative path", () => {
    expect(safeRedirectTarget("/library")).toBe("/library");
  });

  it("falls back to the default for null/undefined/empty", () => {
    expect(safeRedirectTarget(null)).toBe(DEFAULT_REDIRECT);
    expect(safeRedirectTarget(undefined)).toBe(DEFAULT_REDIRECT);
    expect(safeRedirectTarget("")).toBe(DEFAULT_REDIRECT);
  });

  it("falls back to the default for a malicious target", () => {
    expect(safeRedirectTarget("//evil.example")).toBe(DEFAULT_REDIRECT);
    expect(safeRedirectTarget("https://evil.example")).toBe(DEFAULT_REDIRECT);
    expect(safeRedirectTarget("/\\evil.example")).toBe(DEFAULT_REDIRECT);
  });
});
