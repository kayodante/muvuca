import type { Dictionary } from "./dictionaries";

/**
 * Zod schemas encode their custom messages as `validation` dictionary keys
 * (e.g. `.min(1, "required")`), never as literal user-facing text. Only the
 * keys whose value is a string are valid issue keys -- a key that takes
 * interpolation arguments can't stand in for a bare Zod message.
 */
export type ValidationKey = {
  [
    K in keyof Dictionary["validation"]
  ]: Dictionary["validation"][K] extends string ? K : never;
}[keyof Dictionary["validation"]];

/**
 * Translates one Zod issue message. A known `validation` key resolves to
 * its text; anything else -- a default Zod message, a typo, a key that was
 * renamed on one side -- falls back to `validation.invalid` instead of
 * leaking the raw Zod string to the user.
 */
export function translateIssue(message: string, t: Dictionary): string {
  const entry = t.validation[message as ValidationKey];
  return typeof entry === "string" ? entry : t.validation.invalid;
}

/**
 * Translates every message in a `flatten().fieldErrors`-shaped object,
 * keeping the field -> messages[] shape `ActionResult.fieldErrors` expects.
 */
export function translateFieldErrors(
  fieldErrors: Record<string, string[]>,
  t: Dictionary,
): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(fieldErrors).map(([field, messages]) => [
      field,
      messages.map((message) => translateIssue(message, t)),
    ]),
  );
}
