import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PromptCopyButton } from "@/components/items/PromptCopyButton";

const { toast } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("sonner", () => ({ toast }));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.clearAllMocks();
});

async function renderCopyButton(
  content: string,
  props: {
    label?: string;
    pendingLabel?: string;
    successMessage?: string;
    errorMessage?: string;
  } = {},
): Promise<HTMLButtonElement> {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () =>
    root?.render(<PromptCopyButton content={content} {...props} />),
  );

  const button = container.querySelector("button");
  if (!button) throw new Error("Copy button was not rendered.");
  return button;
}

describe("PromptCopyButton", () => {
  it("copies only the supplied prompt content through the Clipboard API", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const button = await renderCopyButton("Line one\nLine two");
    expect(button.textContent).toContain("Copiar conteúdo");
    await act(async () => button.click());

    expect(writeText).toHaveBeenCalledWith("Line one\nLine two");
    expect(toast.success).toHaveBeenCalledWith("Conteúdo copiado.");
  });

  it("supports custom label and success message", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const button = await renderCopyButton("export const foo = 1;", {
      label: "Copiar código",
      successMessage: "Código copiado para a área de transferência.",
    });
    expect(button.textContent).toContain("Copiar código");
    await act(async () => button.click());

    expect(writeText).toHaveBeenCalledWith("export const foo = 1;");
    expect(toast.success).toHaveBeenCalledWith(
      "Código copiado para a área de transferência.",
    );
  });

  it("shows a recoverable error when the Clipboard API rejects", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });

    const button = await renderCopyButton("Private prompt");
    await act(async () => button.click());

    expect(toast.error).toHaveBeenCalledWith(
      "Não foi possível copiar o conteúdo.",
    );
  });

  it("shows custom error message when copy fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });

    const button = await renderCopyButton("Code snippet", {
      label: "Copiar código",
      errorMessage: "Não foi possível copiar o código.",
    });
    await act(async () => button.click());

    expect(toast.error).toHaveBeenCalledWith(
      "Não foi possível copiar o código.",
    );
  });

  it("uses the browser fallback when the Clipboard API is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    const button = await renderCopyButton("Fallback content");
    await act(async () => button.click());

    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(toast.success).toHaveBeenCalledWith("Conteúdo copiado.");
  });
});
