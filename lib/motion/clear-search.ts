/**
 * The search clear moment: the typed text flies out and blurs away while the
 * placeholder flies in behind it, with a glow sweeping under both.
 *
 * Every value comes from the `--clear-*` / `--glow-*` tokens in
 * `app/globals.css`, easing curves included -- handed to the Web Animations
 * API as authored, so the browser's own `cubic-bezier()` parser resolves them
 * in the animation engine. A hand-rolled Newton-Raphson solver used to do
 * that per frame at each of the two call sites, and the two copies had
 * drifted: one regex rejected the spaces the tokens are written with and
 * degraded to linear without a word.
 *
 * The caller still owns what it paints -- the mirror's text and the glow's
 * gradient are built from the query, which is not this module's business.
 */

interface ClearSearchElements {
  readonly mirror: HTMLElement;
  readonly placeholder: HTMLElement;
  readonly glow: HTMLElement;
}

export interface ClearSearchAnimation {
  /**
   * Resolves once the whole `--clear-dur` window elapsed and the animations
   * have released the properties they held, so the caller can safely reset
   * inline styles. Never settles after `cancel()`.
   */
  readonly finished: Promise<void>;
  cancel(): void;
}

export function animateSearchClear({
  mirror,
  placeholder,
  glow,
}: ClearSearchElements): ClearSearchAnimation {
  const root = getComputedStyle(document.documentElement);

  const number = (name: string, fallback: number) => {
    const value = Number.parseFloat(root.getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  };
  const duration = (name: string, fallback: number) => {
    const match = /^(-?(?:\d+|\d*\.\d+))(ms|s)?$/.exec(
      root.getPropertyValue(name).trim(),
    );
    if (!match) return fallback;
    const value = Number(match[1]);
    if (!Number.isFinite(value)) return fallback;
    return match[2] === "s" ? value * 1000 : value;
  };
  // `animate()` throws on an easing it cannot parse, so an unset or malformed
  // token degrades to linear instead of taking the clear button down with it.
  const easing = (name: string) => {
    const value = root.getPropertyValue(name).trim();
    return CSS.supports("transition-timing-function", value) ? value : "linear";
  };

  const total = duration("--clear-dur", 280);
  const outFly = number("--clear-out-fly", 12);
  const inFly = number("--clear-in-fly", 12);
  const blur = number("--clear-blur", 2);
  const glowDelay = duration("--glow-delay", 50);
  const glowPeak = number("--glow-peak-at", 0.15);
  const glowOpacity = number("--glow-opacity", 0.42);

  const out = mirror.animate(
    [
      { transform: "translateY(0px)", opacity: 1, filter: "blur(0px)" },
      {
        transform: `translateY(${outFly}px)`,
        opacity: 0,
        filter: `blur(${blur}px)`,
      },
    ],
    {
      duration: duration("--clear-out-dur", 180),
      easing: easing("--clear-out-ease"),
      fill: "forwards",
    },
  );

  const back = placeholder.animate(
    [
      {
        transform: `translateY(${-inFly}px)`,
        opacity: 0.9,
        filter: `blur(${blur}px)`,
      },
      { transform: "translateY(0px)", opacity: 1, filter: "blur(0px)" },
    ],
    {
      duration: duration("--clear-in-dur", 180),
      easing: easing("--clear-in-ease"),
      fill: "forwards",
    },
  );

  // The glow is the clock: `--clear-dur` is the whole moment and the two fly
  // durations are free to end earlier. Its envelope is linear on purpose --
  // it ramps to `--glow-peak-at` and falls back to nothing.
  const sweep = glow.animate(
    [
      { opacity: 0 },
      { opacity: glowOpacity, offset: glowPeak },
      { opacity: 0 },
    ],
    {
      duration: Math.max(1, total - glowDelay),
      delay: glowDelay,
      easing: "linear",
      fill: "forwards",
    },
  );

  const animations = [out, back, sweep];
  const cancel = () => {
    for (const animation of animations) animation.cancel();
  };

  return {
    finished: new Promise<void>((resolve) => {
      sweep.onfinish = () => {
        // Drops the `forwards` fill -- without it the animations keep
        // painting over the inline styles the caller is about to clear.
        cancel();
        resolve();
      };
    }),
    cancel,
  };
}
