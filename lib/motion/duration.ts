/** Converts a resolved CSS duration (`120ms` or `.12s`) to milliseconds. */
export function cssDurationToMs(value: string, fallback: number): number {
  const match = /^(\d*\.?\d+)(ms|s)$/.exec(value.trim());
  if (!match) return fallback;

  const duration = Number(match[1]);
  if (!Number.isFinite(duration)) return fallback;

  return match[2] === "s" ? duration * 1000 : duration;
}
