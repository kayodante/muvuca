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

/** "Esqueci a senha" request: only an email, same shape as `emailSchema`. */
export const forgotPasswordSchema = z.object({ email: emailSchema });

/**
 * New password submitted on `/reset-password`. `confirmPassword` is capped
 * at the same 72 chars but has no `.min()` -- a too-short confirm value
 * should surface as "doesn't match", not as its own separate length error.
 */
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().max(72),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwordMismatch",
    path: ["confirmPassword"],
  });
