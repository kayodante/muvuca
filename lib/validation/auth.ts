import { z } from "zod";

/** Email input shared by every auth flow (login, password reset, ...). */
export const emailSchema = z.email().max(254);

/**
 * Login credentials. No minimum length on `password` here: that's a policy
 * for *setting* a password (see `passwordSchema`), not for accepting
 * whatever a returning user already has. The 72-char cap matches bcrypt/
 * GoTrue's input limit.
 */
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
  next: z.string().max(2048).optional(),
});

/** New/changed password policy (signup, reset). Not used at login. */
export const passwordSchema = z.string().min(12).max(72);
