import { describe, expect, it } from "vitest";
import {
  emailSchema,
  passwordSchema,
  signInSchema,
} from "@/lib/validation/auth";

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
  it("accepts an email and password without next", () => {
    const parsed = signInSchema.safeParse({
      email: "user@example.com",
      password: "whatever",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a missing email", () => {
    expect(
      signInSchema.safeParse({ password: "whatever", next: "/library" })
        .success,
    ).toBe(false);
  });

  it("rejects a missing password", () => {
    expect(signInSchema.safeParse({ email: "user@example.com" }).success).toBe(
      false,
    );
  });

  it("rejects an empty password", () => {
    expect(
      signInSchema.safeParse({ email: "user@example.com", password: "" })
        .success,
    ).toBe(false);
  });

  it("rejects a password over the 72-char bcrypt/GoTrue limit", () => {
    expect(
      signInSchema.safeParse({
        email: "user@example.com",
        password: "a".repeat(73),
      }).success,
    ).toBe(false);
  });

  it("accepts a short password (no minimum-length policy at login)", () => {
    expect(
      signInSchema.safeParse({ email: "user@example.com", password: "a" })
        .success,
    ).toBe(true);
  });
});

describe("passwordSchema", () => {
  it("rejects a password under 12 characters", () => {
    expect(passwordSchema.safeParse("short-pw1").success).toBe(false);
  });

  it("accepts a password of 12 or more characters", () => {
    expect(passwordSchema.safeParse("long-enough-password").success).toBe(
      true,
    );
  });

  it("rejects a password over the 72-char limit", () => {
    expect(passwordSchema.safeParse("a".repeat(73)).success).toBe(false);
  });
});
