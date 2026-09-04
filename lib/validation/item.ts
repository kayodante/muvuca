import { z } from "zod";

export const ITEM_TYPES = ["link", "prompt", "code_component"] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

export const itemTypeSchema = z.enum(ITEM_TYPES);
export const itemIdSchema = z.uuid();
/** Teto do escopo de uma drenagem: uma página da biblioteca cabe folgada
 * aqui. Rejeitar cedo evita que um cliente adulterado peça uma lista
 * arbitrariamente grande. */
export const PREVIEW_SCOPE_MAX_IDS = 60;
export const previewScopeSchema = z
  .array(itemIdSchema)
  .max(PREVIEW_SCOPE_MAX_IDS);
/** Quantos jobs uma rodada de drenagem reivindica. Espelha o `least(..., 6)`
 * da RPC `claim_preview_jobs`; mudar aqui exige mudar a migration junto.
 * Mora neste módulo (e não em `lib/actions/previews.ts`) porque um arquivo
 * `"use server"` só pode exportar funções async, e o cliente
 * (`usePreviewDrain`) deriva o teto de rodadas deste mesmo número. */
export const PREVIEW_CLAIM_LIMIT = 6;
export const ITEM_TITLE_MAX_LENGTH = 240;
export const ITEM_URL_MAX_LENGTH = 4096;
export const itemTitleSchema = z
  .string()
  .trim()
  .min(1)
  .max(ITEM_TITLE_MAX_LENGTH);
export const itemDescriptionSchema = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.string().trim().max(2000).nullable(),
);
export const itemContentSchema = z
  .string()
  .min(1)
  .max(100_000)
  .refine((value) => value.trim().length > 0, "O conteúdo é obrigatório.");

export function normalizeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export const itemUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(ITEM_URL_MAX_LENGTH)
  .refine(
    (value) => normalizeHttpUrl(value) !== null,
    "Informe uma URL http ou https válida.",
  );

const itemTagIdsSchema = z
  .array(z.uuid())
  .max(100)
  .superRefine((tagIds, ctx) => {
    if (new Set(tagIds).size !== tagIds.length) {
      ctx.addIssue({
        code: "custom",
        message: "Uma tag só pode ser associada uma vez.",
      });
    }
  });

const itemBaseSchema = z.object({
  title: itemTitleSchema,
  description: itemDescriptionSchema,
  tagIds: itemTagIdsSchema,
});

export const createItemSchema = z.discriminatedUnion("type", [
  itemBaseSchema.extend({ type: z.literal("link"), url: itemUrlSchema }),
  itemBaseSchema.extend({
    type: z.literal("prompt"),
    content: itemContentSchema,
  }),
  itemBaseSchema.extend({
    type: z.literal("code_component"),
    content: itemContentSchema,
    url: itemUrlSchema.nullable().optional(),
  }),
]);

export const updateItemSchema = z.discriminatedUnion("type", [
  itemBaseSchema.extend({
    id: itemIdSchema,
    type: z.literal("link"),
    url: itemUrlSchema,
  }),
  itemBaseSchema.extend({
    id: itemIdSchema,
    type: z.literal("prompt"),
    content: itemContentSchema,
  }),
  itemBaseSchema.extend({
    id: itemIdSchema,
    type: z.literal("code_component"),
    content: itemContentSchema,
    url: itemUrlSchema.nullable().optional(),
  }),
]);
