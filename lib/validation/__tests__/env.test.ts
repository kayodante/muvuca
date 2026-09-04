import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { __resetEnvCacheForTests, getEnv } from "@/lib/validation/env";

const REQUIRED_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
};

describe("getEnv", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    __resetEnvCacheForTests();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    __resetEnvCacheForTests();
  });

  it("parses a valid environment", () => {
    Object.assign(process.env, REQUIRED_ENV);
    const env = getEnv();
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe(
      REQUIRED_ENV.NEXT_PUBLIC_SUPABASE_URL,
    );
  });

  it("throws when a required variable is missing", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = undefined;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      REQUIRED_ENV.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.NEXT_PUBLIC_APP_URL = REQUIRED_ENV.NEXT_PUBLIC_APP_URL;

    expect(() => getEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("throws when a public URL is not a valid URL", () => {
    Object.assign(process.env, REQUIRED_ENV, {
      NEXT_PUBLIC_APP_URL: "not-a-url",
    });

    expect(() => getEnv()).toThrow();
  });

  it("rejects a secret key in the public key variable", () => {
    Object.assign(process.env, REQUIRED_ENV, {
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        "sb_" + "secret_must_never_be_public",
    });

    expect(() => getEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });

  it("requires HTTPS for non-local origins", () => {
    Object.assign(process.env, REQUIRED_ENV, {
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "http://muvuca.example.com",
    });

    expect(() => getEnv()).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it("rejects paths in canonical origins", () => {
    Object.assign(process.env, REQUIRED_ENV, {
      NEXT_PUBLIC_APP_URL: "https://muvuca.example.com/library",
    });

    expect(() => getEnv()).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it("caches the parsed result across calls", () => {
    Object.assign(process.env, REQUIRED_ENV);
    const first = getEnv();
    process.env.NEXT_PUBLIC_APP_URL = "http://changed.example.com";
    const second = getEnv();
    expect(second).toBe(first);
  });
});
