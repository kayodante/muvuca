import { afterEach, describe, expect, it, vi } from "vitest";

import { morph } from "./view-transition";

/**
 * jsdom has no View Transitions, so every test installs its own
 * `startViewTransition`. Only `finished` and the callback matter here; the
 * rest of the `ViewTransition` shape exists to satisfy the DOM lib type.
 */
function installViewTransition(
  implementation: (callback: () => void) => Promise<void>,
) {
  const start = vi.fn((callback: () => void) => {
    const finished = implementation(callback);
    // `morph` only ever awaits `finished`; the other two would surface as
    // unhandled rejections in the skipped-transition case.
    const settled = finished.catch(() => {});
    return {
      finished,
      ready: settled,
      updateCallbackDone: settled,
      types: new Set<string>(),
      skipTransition: () => {},
    } as unknown as ViewTransition;
  });
  document.startViewTransition = start;
  return start;
}

function setReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduce && query.includes("reduce"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, "startViewTransition");
  delete document.documentElement.dataset.viewTransition;
});

describe("morph", () => {
  it("runs only the commit when the API is missing", () => {
    setReducedMotion(false);
    const prepare = vi.fn();
    const commit = vi.fn();

    morph(prepare, commit);

    expect(prepare).not.toHaveBeenCalled();
    expect(commit).toHaveBeenCalledOnce();
  });

  it("runs only the commit when the user asked for reduced motion", () => {
    setReducedMotion(true);
    const start = installViewTransition(async (callback) => callback());
    const prepare = vi.fn();
    const commit = vi.fn();

    morph(prepare, commit);

    expect(prepare).not.toHaveBeenCalled();
    expect(commit).toHaveBeenCalledOnce();
    expect(start).not.toHaveBeenCalled();
  });

  it("tags the root, prepares before the snapshot, and commits inside it", async () => {
    setReducedMotion(false);
    const order: string[] = [];
    installViewTransition(async (callback) => {
      order.push("snapshot");
      callback();
    });

    morph(
      () => order.push("prepare"),
      () => order.push("commit"),
    );

    expect(order).toEqual(["prepare", "snapshot", "commit"]);
    await vi.waitFor(() =>
      expect(document.documentElement.dataset.viewTransition).toBeUndefined(),
    );
  });

  it("clears the root flag even when the transition is skipped", async () => {
    setReducedMotion(false);
    installViewTransition(async (callback) => {
      callback();
      throw new Error("skipped");
    });

    morph(
      () => {},
      () => {},
    );

    await vi.waitFor(() =>
      expect(document.documentElement.dataset.viewTransition).toBeUndefined(),
    );
  });
});
