import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PromptCopyButton } from "@/components/items/PromptCopyButton";

const { toast } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
const { announce } = vi.hoisted(() => ({ announce: vi.fn() }));

vi.mock("sonner", () => ({ toast }));
vi.mock("@/components/states/Announcer", () => ({ announce }));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.clearAllMocks();
});

// Mirrors the PT defaults PromptCopyButton used to fall back to before its
// props became required (AAA-215): every test overrides only what it needs
// to assert, same as its real caller (PromptDetailDialog) always passing
// every prop explicitly from the dictionary.
const DEFAULT_PROPS = {
  label: "Copiar conteúdo",
  pendingLabel: "Copiando conteúdo",
  successLabel: "Copiado!",
  successMessage: "Conteúdo copiado.",
  errorMessage: "Não foi possível copiar o conteúdo.",
};

async function renderCopyButton(
  content: string,
  props: Partial<typeof DEFAULT_PROPS> = {},
): Promise<HTMLButtonElement> {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () =>
    root?.render(
      <PromptCopyButton content={content} {...DEFAULT_PROPS} {...props} />,
    ),
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
    expect(announce).toHaveBeenCalledWith("Conteúdo copiado.");
    expect(toast.success).not.toHaveBeenCalled();
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
    expect(announce).toHaveBeenCalledWith(
      "Código copiado para a área de transferência.",
    );
    expect(toast.success).not.toHaveBeenCalled();
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
    expect(announce).toHaveBeenCalledWith("Conteúdo copiado.");
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("exibe o estado tátil de confirmação com icon-swap e retorna ao repouso", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const button = await renderCopyButton("Prompt de teste", {
      label: "Copiar prompt",
      pendingLabel: "Copiando prompt",
      successLabel: "Prompt copiado!",
    });

    const iconSwap = button.querySelector(".t-icon-swap");
    expect(iconSwap?.getAttribute("data-state")).toBe("a");
    expect(button.textContent).toContain("Copiar prompt");

    await act(async () => button.click());

    expect(button.textContent).toContain("Prompt copiado!");
    expect(iconSwap?.getAttribute("data-state")).toBe("b");

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(button.textContent).toContain("Copiar prompt");
    expect(iconSwap?.getAttribute("data-state")).toBe("a");
    vi.useRealTimers();
  });
});
