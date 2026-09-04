import { test, expect } from "@playwright/test";

test("GET / responds with baseline security headers", async ({ request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);

  const headers = response.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toBeTruthy();
  expect(headers["content-security-policy"]).toContain("'strict-dynamic'");
  expect(headers["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(headers["cache-control"]).toBe("private, no-store");
  expect(headers["x-powered-by"]).toBeUndefined();
});
