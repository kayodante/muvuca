import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The E2E port is written down twice: as `E2E_PORT` in playwright.config.ts
 * and inside `additional_redirect_urls` in supabase/config.toml. Nothing
 * connects them, and a mismatch does not fail loudly -- Supabase Auth simply
 * refuses the magic link's `emailRedirectTo`, falls back to `site_url`, and
 * the sign-in callback lands on whatever is listening on that other port.
 * The suite then fails deep inside the first test, looking like a product
 * bug rather than a config typo.
 */
const ROOT = process.cwd();

function e2ePort(): string {
  const config = readFileSync(path.join(ROOT, "playwright.config.ts"), "utf8");
  const match = config.match(
    /E2E_PORT\s*=\s*process\.env\.E2E_PORT\s*\?\?\s*"(\d+)"/,
  );

  if (!match?.[1]) {
    throw new Error("Could not read E2E_PORT from playwright.config.ts");
  }

  return match[1];
}

function redirectAllowlist(): string {
  const config = readFileSync(
    path.join(ROOT, "supabase", "config.toml"),
    "utf8",
  );
  const match = config.match(/additional_redirect_urls\s*=\s*\[([^\]]*)\]/);

  if (!match?.[1]) {
    throw new Error(
      "Could not read additional_redirect_urls from supabase/config.toml",
    );
  }

  return match[1];
}

describe("E2E port", () => {
  it("is allowlisted for Supabase Auth redirects", () => {
    expect(redirectAllowlist()).toContain(`http://127.0.0.1:${e2ePort()}/`);
  });
});
