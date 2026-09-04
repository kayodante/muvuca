import { z } from "zod";

/** Fallback destination whenever `next` is absent or fails validation. */
export const DEFAULT_REDIRECT = "/library";

/**
 * Only a same-origin relative path is ever accepted as a redirect target --
 * this closes the open-redirect vector in the auth callback. Rejects
 * protocol-relative targets (`//evil`), backslash tricks (`/\evil`,
 * browsers treat `\` as `/`), absolute URLs (`https://evil`), and
 * whitespace/control characters that could be used for header injection.
 */
export const redirectTargetSchema = z
  .string()
  .max(2048)
  .refine((value) => /^\/(?!\/)[^\s\\]*$/.test(value), {
    message: "Redirect target must be a same-origin relative path",
  });

/** Validates `value` as a redirect target, falling back to a safe default. */
export function safeRedirectTarget(value: string | null | undefined): string {
  if (!value) return DEFAULT_REDIRECT;

  const parsed = redirectTargetSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_REDIRECT;
}
