import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import AppError from "@/app/(app)/error";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

async function renderAppError(reset: () => void): Promise<HTMLDivElement> {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () => root?.render(<AppError reset={reset} />));

  return container;
}

describe("AppError", () => {
  it("shows a recoverable, specific message instead of the generic root error screen", async () => {
    const rendered = await renderAppError(vi.fn());

    expect(rendered.textContent).toContain(
      "Não foi possível carregar sua conta",
    );
    expect(rendered.textContent).not.toContain("Algo deu errado");
  });

  it("wires the retry button to the segment's reset()", async () => {
    const reset = vi.fn();
    const rendered = await renderAppError(reset);

    const button = rendered.querySelector("button");
    if (!button) throw new Error("Retry button was not rendered.");

    await act(async () => button.click());

    expect(reset).toHaveBeenCalledOnce();
  });
});
