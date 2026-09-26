import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useTransientFlag } from "./useTransientFlag";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.useRealTimers();
});

async function renderFlag() {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  function Flag() {
    const [on, trigger] = useTransientFlag(1500);
    return <button data-state={on ? "on" : "off"} onClick={trigger} />;
  }

  await act(async () => root?.render(<Flag />));
  return container.querySelector("button") as HTMLButtonElement;
}

describe("useTransientFlag", () => {
  it("reinicia os 1,5s quando acionada novamente", async () => {
    const button = await renderFlag();
    vi.useFakeTimers();

    await act(async () => button.click());
    expect(button.dataset.state).toBe("on");
    await act(async () => vi.advanceTimersByTime(1000));
    await act(async () => button.click());
    await act(async () => vi.advanceTimersByTime(600));
    expect(button.dataset.state).toBe("on");
    await act(async () => vi.advanceTimersByTime(1000));
    expect(button.dataset.state).toBe("off");
  });

  it("limpa o timer ao desmontar", async () => {
    const button = await renderFlag();
    vi.useFakeTimers();

    await act(async () => button.click());
    expect(vi.getTimerCount()).toBe(1);
    await act(async () => root?.unmount());
    root = null;
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => vi.advanceTimersByTime(1500));
  });
});
