import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logEvent, redact } from "@/lib/security/logging";

describe("redact", () => {
  it("redacts JWT-shaped tokens", () => {
    const token =
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
    expect(redact(`Authorization: Bearer ${token}`)).not.toContain(token);
    expect(redact(`Authorization: Bearer ${token}`)).toContain(
      "[redacted-token]",
    );
  });

  it("redacts email addresses", () => {
    expect(redact("contact user@example.com now")).toBe(
      "contact [redacted-email] now",
    );
  });

  it("leaves ordinary text untouched", () => {
    expect(redact("item.create_failed")).toBe("item.create_failed");
  });
});

describe("logEvent", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("never emits fields outside the allowlist", () => {
    logEvent({
      event: "item.create_failed",
      status: "failure",
      entityId: "contact leaked-user@example.com",
    } as never);

    const payload = JSON.parse(logSpy.mock.calls[0]?.[0] as string);
    expect(Object.keys(payload).sort()).toEqual(
      ["entityId", "environment", "event", "status", "timestamp"].sort(),
    );
    expect(payload.entityId).not.toContain("leaked-user@example.com");
  });
});
