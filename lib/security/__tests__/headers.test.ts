import { describe, expect, it } from "vitest";

import {
  baselineSecurityHeaders,
  buildContentSecurityPolicy,
} from "../headers";

const NONCE = "test-nonce";

function directive(policy: string, name: string) {
  return policy
    .split(";")
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `));
}

describe("buildContentSecurityPolicy", () => {
  const production = buildContentSecurityPolicy(NONCE, false);

  it("keeps stylesheet elements nonce-gated in production", () => {
    expect(directive(production, "style-src")).toBe(
      `style-src 'self' 'nonce-${NONCE}'`,
    );
    expect(directive(production, "style-src")).not.toContain("unsafe-inline");
  });

  it("exempts style attributes only, for runtime popup positioning", () => {
    // Narrowing the exemption to attributes is the whole point: widening it
    // back into `style-src` would also admit injected <style> elements.
    expect(directive(production, "style-src-attr")).toBe(
      "style-src-attr 'unsafe-inline'",
    );
  });

  it("never ships unsafe-eval or unsafe-inline scripts in production", () => {
    const scriptSrc = directive(production, "script-src") ?? "";
    expect(scriptSrc).toContain(`'nonce-${NONCE}'`);
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("unsafe-eval");
    expect(scriptSrc).not.toContain("unsafe-inline");
  });

  it("locks down the framing, object and base-uri surface", () => {
    expect(directive(production, "frame-ancestors")).toBe(
      "frame-ancestors 'none'",
    );
    expect(directive(production, "object-src")).toBe("object-src 'none'");
    expect(directive(production, "base-uri")).toBe("base-uri 'self'");
    expect(directive(production, "form-action")).toBe("form-action 'self'");
  });

  it("only relaxes script-src for the dev build's eval-based stacks", () => {
    expect(
      directive(buildContentSecurityPolicy(NONCE, true), "script-src") ?? "",
    ).toContain("'unsafe-eval'");
  });
});

describe("baselineSecurityHeaders", () => {
  it("adds HSTS in production only", () => {
    const keys = (isProduction: boolean) =>
      baselineSecurityHeaders(isProduction).map((header) => header.key);

    expect(keys(true)).toContain("Strict-Transport-Security");
    expect(keys(false)).not.toContain("Strict-Transport-Security");
  });
});
