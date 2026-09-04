import { defineConfig, devices } from "@playwright/test";

/**
 * Dedicated E2E port, deliberately not the dev server's 3000.
 *
 * `reuseExistingServer` is on locally, and Playwright decides a server is
 * "already running" from nothing but a successful probe of this URL -- it
 * cannot tell our app from anything else listening there. On a machine
 * where 3000 is a popular default (another project's dev server, a
 * container published to 3000), the suite silently runs against the wrong
 * application and every test fails in a way that looks like a product bug.
 *
 * Any port set here must also be allowlisted in `additional_redirect_urls`
 * (supabase/config.toml), or Supabase Auth rejects the magic link's
 * `emailRedirectTo` and falls back to `site_url`, sending the sign-in
 * callback to whatever lives on that other port. That pairing is asserted by
 * `__tests__/e2e-port-allowlist.test.ts`.
 *
 * The port is the single source of truth and the URL is derived from it, so
 * the two cannot disagree. Overriding is deliberately `E2E_PORT` and not
 * `PORT`/`NEXT_PUBLIC_APP_URL`: those describe the dev and production app,
 * and reading them here is what let CI (which exports
 * `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000`) point Playwright at :3000
 * while `next start` listened on :3210, timing out before a single test ran.
 */
const E2E_PORT = process.env.E2E_PORT ?? "3210";
// Exported so `e2e/helpers.ts` builds the magic link's `emailRedirectTo`
// from the same value, instead of keeping a second copy of the port.
export const E2E_APP_URL = `http://127.0.0.1:${E2E_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }]],
  use: {
    // 127.0.0.1 rather than localhost on purpose: they are different cookie
    // origins, and the magic link's `emailRedirectTo` is built from the
    // `NEXT_PUBLIC_APP_URL` handed to the server below.
    baseURL: E2E_APP_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm start",
    url: E2E_APP_URL,
    // Both are forced, never inherited: whatever the shell or the CI job
    // exports for the dev app must not reach the server under test.
    // `getEnv()` parses `process.env` as a whole object rather than reading
    // `process.env.NEXT_PUBLIC_APP_URL` as a literal member expression, so
    // Next never inlines it and the server picks this up at runtime -- the
    // prebuilt bundle does not have to be rebuilt per port.
    env: { PORT: E2E_PORT, NEXT_PUBLIC_APP_URL: E2E_APP_URL },
    reuseExistingServer: !process.env.CI,
  },
});
