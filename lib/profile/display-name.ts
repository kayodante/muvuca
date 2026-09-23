import { z } from "zod";

/** Espelha `user_preferences_display_name_valid` (0029_user_display_name.sql). */
export const DISPLAY_NAME_MAX_LENGTH = 50;

/** String vazia depois do trim limpa o nome (`null`), não é erro. */
export const displayNameSchema = z
  .string()
  .trim()
  .max(
    DISPLAY_NAME_MAX_LENGTH,
    `Use no máximo ${DISPLAY_NAME_MAX_LENGTH} caracteres.`,
  )
  .refine(
    (value) => !/\p{Cc}/u.test(value),
    "Use só texto, sem quebras de linha.",
  )
  .transform((value) => (value === "" ? null : value));

/**
 * Até duas letras: primeira e última palavra ("Kayo Dante" -> "KD").
 * `Array.from` para não partir um emoji/surrogate pela metade.
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0];
  if (!first) return "?";
  const last = words.length > 1 ? words[words.length - 1] : undefined;
  const letters = [first, last]
    .filter((word): word is string => word !== undefined)
    .map((word) => Array.from(word)[0] ?? "");
  return letters.join("").toLocaleUpperCase("pt-BR");
}
