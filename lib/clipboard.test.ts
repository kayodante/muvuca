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

  it("returns false when the Clipboard API rejects", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    await expect(copyToClipboard("fallback content")).resolves.toBe(false);
  });

  it("returns false when navigator.clipboard is undefined", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });

    await expect(copyToClipboard("fallback content")).resolves.toBe(false);
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

  it("returns false when the deferred write and writeText both fail", async () => {
    const write = vi.fn().mockRejectedValue(new Error("refused"));
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { write, writeText },
    });
    vi.stubGlobal("ClipboardItem", vi.fn());

    await expect(
      copyToClipboard(Promise.resolve("failed content")),
    ).resolves.toBe(false);
    expect(writeText).toHaveBeenCalledWith("failed content");
  });
});
