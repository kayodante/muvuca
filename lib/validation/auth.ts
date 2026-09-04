import { z } from "zod";

/** Email input for magic-link sign-in. */
export const emailSchema = z.email().max(254);

export const signInSchema = z.object({
  email: emailSchema,
  next: z.string().max(2048).optional(),
});
