import type { Locale } from "../config";
import { ptBR, type Dictionary } from "./pt-BR";
import { en } from "./en";

export const dictionaries: Record<Locale, Dictionary> = {
  "pt-BR": ptBR,
  en,
};

export type { Dictionary };
