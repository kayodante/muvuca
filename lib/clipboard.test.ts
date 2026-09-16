import { afterEach, describe, expect, it, vi } from "vitest";
import { copyToClipboard } from "./clipboard";

describe("copyToClipboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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

  it("hands a pending promise to ClipboardItem instead of awaiting it", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { write, writeText },
    });
    const clipboardItem = vi.fn();
    vi.stubGlobal("ClipboardItem", clipboardItem);

    const pending = Promise.resolve("full body");
    const result = await copyToClipboard(pending);

    expect(result).toBe(true);
    expect(clipboardItem).toHaveBeenCalledOnce();
    // O valor entregue ao ClipboardItem ainda é uma promise: é isso que
    // preserva a ativação transitória do clique no WebKit.
    const payload = clipboardItem.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload["text/plain"]).toBeInstanceOf(Promise);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to writeText when ClipboardItem is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    vi.stubGlobal("ClipboardItem", undefined);

    const result = await copyToClipboard(Promise.resolve("full body"));

    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith("full body");
  });

  it("returns false when the pending text never arrives", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    vi.stubGlobal("ClipboardItem", undefined);

    const result = await copyToClipboard(Promise.reject(new Error("offline")));

    expect(result).toBe(false);
    expect(writeText).not.toHaveBeenCalled();
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
