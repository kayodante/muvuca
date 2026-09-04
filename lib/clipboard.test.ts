import { afterEach, describe, expect, it, vi } from "vitest";
import { copyToClipboard } from "./clipboard";

describe("copyToClipboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the Clipboard API when available and resolved", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const result = await copyToClipboard("test content");
    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith("test content");
  });

  it("falls back to execCommand when Clipboard API rejects", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    const result = await copyToClipboard("fallback content");
    expect(result).toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
  });

  it("falls back to execCommand when navigator.clipboard is undefined", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });

    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    const result = await copyToClipboard("fallback content");
    expect(result).toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
  });

  it("returns false when both methods fail", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });

    const execCommand = vi.fn().mockReturnValue(false);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    const result = await copyToClipboard("failed content");
    expect(result).toBe(false);
  });
});
