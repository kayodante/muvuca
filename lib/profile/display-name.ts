import { z } from "zod";

/** Espelha `user_preferences_display_name_valid` (0029_user_display_name.sql). */
export const DISPLAY_NAME_MAX_LENGTH = 50;

/**
 * Conta code points, como o `char_length` do Postgres. `.length` e o
 * `maxLength` do input contam UTF-16: emoji vale 2 e um nome válido no
 * banco seria recusado aqui.
 */
function codePointLength(value: string): number {
  return Array.from(value).length;
}

/** String vazia depois do trim limpa o nome (`null`), não é erro. */
export const displayNameSchema = z
  .string()
  .trim()
  .refine(
    (value) => codePointLength(value) <= DISPLAY_NAME_MAX_LENGTH,
    `Use no máximo ${DISPLAY_NAME_MAX_LENGTH} caracteres.`,
  )
  .refine(
    (value) => !/\p{Cc}/u.test(value),
    "Use só texto, sem quebras de linha.",
  )
  .transform((value) => (value === "" ? null : value));

const graphemes = new Intl.Segmenter("pt-BR", { granularity: "grapheme" });

/** Primeiro grafema inteiro: bandeira, emoji ZWJ e "é" decomposto não partem. */
function firstGrapheme(word: string): string {
  return graphemes.segment(word)[Symbol.iterator]().next().value?.segment ?? "";
}

/** Até duas letras: primeira e última palavra ("Kayo Dante" -> "KD"). */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0];
  if (!first) return "?";
  const last = words.length > 1 ? words[words.length - 1] : undefined;
  const letters = [first, last]
    .filter((word): word is string => word !== undefined)
    .map(firstGrapheme);
  return letters.join("").toLocaleUpperCase("pt-BR");
}
