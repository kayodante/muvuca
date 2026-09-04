import { describe, expect, it } from "vitest";
import { fail, mapPostgresErrorCode, ok } from "@/lib/utils/result";

describe("ok/fail", () => {
  it("wraps success data", () => {
    expect(ok({ id: "1" })).toEqual({ ok: true, data: { id: "1" } });
  });

  it("wraps failure with code and message", () => {
    expect(fail("VALIDATION_FAILED", "invalid")).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      message: "invalid",
      fieldErrors: undefined,
    });
  });
});

describe("mapPostgresErrorCode", () => {
  it("maps unique_violation to DUPLICATE", () => {
    expect(mapPostgresErrorCode("23505")).toBe("DUPLICATE");
  });

  it("maps foreign_key_violation to INVALID_REFERENCE", () => {
    expect(mapPostgresErrorCode("23503")).toBe("INVALID_REFERENCE");
  });

  it("maps check_violation to CONSTRAINT_VIOLATION", () => {
    expect(mapPostgresErrorCode("23514")).toBe("CONSTRAINT_VIOLATION");
  });

  it("maps not_null_violation to MISSING_REQUIRED_FIELD", () => {
    expect(mapPostgresErrorCode("23502")).toBe("MISSING_REQUIRED_FIELD");
  });

  it("maps insufficient_privilege to FORBIDDEN", () => {
    expect(mapPostgresErrorCode("42501")).toBe("FORBIDDEN");
  });

  it("falls back to UNKNOWN for unmapped or missing codes", () => {
    expect(mapPostgresErrorCode("99999")).toBe("UNKNOWN");
    expect(mapPostgresErrorCode(undefined)).toBe("UNKNOWN");
  });
});
