import { afterEach, describe, expect, it, vi } from "vitest";

import { animateSearchClear } from "./clear-search";

/**
 * jsdom has no Web Animations API, so the test installs its own `animate`
 * and asserts on what the module hands the browser. That is the whole point
 * of the change: the easing token travels to the engine as authored instead
 * of through a hand-rolled solver whose regex rejected the spaces.
 */
type Recorded = { keyframes: Keyframe[]; options: KeyframeAnimationOptions };

Element.prototype.animate = (() => {
  throw new Error("Element.animate stub was called without a spy in place");
}) as unknown as Element["animate"];

function installAnimate() {
  const calls: Recorded[] = [];
  // A spy rather than a bare assignment: `vi.restoreAllMocks()` undoes it.
  vi.spyOn(Element.prototype, "animate").mockImplementation(function (
    this: Element,
    keyframes?: Keyframe[] | PropertyIndexedKeyframes | null,
    options?: number | KeyframeAnimationOptions,
  ) {
    calls.push({
      keyframes: (keyframes ?? []) as Keyframe[],
      options: (options ?? {}) as KeyframeAnimationOptions,
    });
    return { cancel: vi.fn(), onfinish: null } as unknown as Animation;
  });
  return calls;
}

function setTokens(tokens: Record<string, string>) {
  vi.spyOn(window, "getComputedStyle").mockReturnValue({
    getPropertyValue: (name: string) => tokens[name] ?? "",
  } as unknown as CSSStyleDeclaration);
}

function run() {
  const element = () => document.createElement("div");
  return animateSearchClear({
    mirror: element(),
    placeholder: element(),
    glow: element(),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("animateSearchClear", () => {
  it("passes the spaced cubic-bezier token straight through", () => {
    // Exactly how `--clear-out-ease` is authored in `app/globals.css`.
    const authored = "cubic-bezier(0.22, 1, 0.36, 1)";
    setTokens({
      "--clear-out-ease": ` ${authored} `,
      "--clear-in-ease": authored,
    });
    const calls = installAnimate();

    run();

    expect(calls[0]?.options.easing).toBe(authored);
    expect(calls[1]?.options.easing).toBe(authored);
  });

  it("falls back to linear when the token is missing or malformed", () => {
    setTokens({
      "--clear-out-ease": "",
      "--clear-in-ease": "cubic-bezier(oops)",
    });
    const calls = installAnimate();

    run();

    expect(calls[0]?.options.easing).toBe("linear");
    expect(calls[1]?.options.easing).toBe("linear");
  });

  it("runs the glow for the full clear window after its delay", () => {
    setTokens({
      "--clear-dur": "900ms",
      "--glow-delay": "50",
      "--glow-peak-at": "0.2",
    });
    const calls = installAnimate();

    run();

    const glow = calls[2];
    expect(glow?.options.delay).toBe(50);
    expect(glow?.options.duration).toBe(850);
    expect(glow?.keyframes[1]?.offset).toBe(0.2);
  });

  it("converts computed second durations to milliseconds", () => {
    setTokens({
      "--clear-dur": ".28s",
      "--clear-out-dur": ".18s",
      "--clear-in-dur": ".18s",
      "--glow-delay": ".05s",
    });
    const calls = installAnimate();

    run();

    expect(calls[0]?.options.duration).toBe(180);
    expect(calls[1]?.options.duration).toBe(180);
    expect(calls[2]?.options.delay).toBe(50);
    expect(calls[2]?.options.duration).toBe(230);
  });
});
