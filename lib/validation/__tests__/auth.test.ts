import { describe, expect, it } from "vitest";
import { emailSchema, signInSchema } from "@/lib/validation/auth";

describe("emailSchema", () => {
  it("accepts a valid email", () => {
    expect(emailSchema.safeParse("user@example.com").success).toBe(true);
  });

  it("rejects a malformed email", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });

  it("rejects an email over the length limit", () => {
    const local = "a".repeat(250);
    expect(emailSchema.safeParse(`${local}@example.com`).success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("accepts an email without next", () => {
    const parsed = signInSchema.safeParse({ email: "user@example.com" });
    expect(parsed.success).toBe(true);
  });

  it("rejects a missing email", () => {
    expect(signInSchema.safeParse({ next: "/library" }).success).toBe(false);
  });
});
