import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { announce, Announcer } from "./Announcer";

afterEach(() => vi.unstubAllGlobals());

it("anuncia duas cópias seguidas com o mesmo texto", async () => {
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });

  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<Announcer />));
  const status = container.querySelector('[role="status"]');
  expect(status).not.toBeNull();
  expect(status?.classList.contains("sr-only")).toBe(true);

  announce("Copiado.");
  announce("Copiado.");

  const observer = new MutationObserver(() => {});
  observer.observe(status!, { childList: true });
  const observed: string[] = [];
  while (frames.length) {
    frames.shift()?.(0);
    if (observer.takeRecords().length) observed.push(status!.textContent ?? "");
  }

  expect(observed).toEqual(["Copiado.", "", "Copiado."]);
  observer.disconnect();
  await act(async () => root.unmount());
  container.remove();
});
