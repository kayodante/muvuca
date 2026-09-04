import { z } from "zod";

import { MAX_BACKUP_ITEMS, MAX_BACKUP_TAGS } from "./types";
import { SUPPORTED_BACKUP_VERSIONS } from "@/lib/export/formatter";
import {
  itemContentSchema,
  itemDescriptionSchema,
  itemTitleSchema,
  itemUrlSchema,
  normalizeHttpUrl,
} from "@/lib/validation/item";
import {
  tagColorSchema,
  tagDescriptionSchema,
  tagNameSchema,
} from "@/lib/validation/tag";

// PostgREST serializa timestamptz como "2026-08-15T00:00:00+00:00", então o
// offset precisa ser aceito -- o default de z.iso.datetime() só admite "Z".
const timestampSchema = z.iso.datetime({ offset: true });

const tagIdsSchema = z
  .array(z.uuid())
  .max(100)
  .refine((ids) => new Set(ids).size === ids.length, "Tags repetidas no item.");

const backupFileTagSchema = z.object({
  id: z.uuid(),
  name: tagNameSchema,
  colorToken: tagColorSchema,
  parentId: z.uuid().nullable(),
  // Ausentes em arquivo do formato 1.0 -- `tagDescriptionSchema` já trata
  // "" e undefined como null; `createdAt` fica undefined quando ausente e
  // vira null em toBackupPayload, para a RPC usar now() só em tag nova.
  description: tagDescriptionSchema.optional(),
  createdAt: timestampSchema.optional(),
});

const backupFileItemBaseSchema = z.object({
  id: z.uuid(),
  title: itemTitleSchema,
  description: itemDescriptionSchema,
  tagIds: tagIdsSchema,
  createdAt: timestampSchema,
});

const backupFileItemSchema = z.discriminatedUnion("type", [
  backupFileItemBaseSchema.extend({
    type: z.literal("link"),
    url: itemUrlSchema,
    content: z.null(),
  }),
  backupFileItemBaseSchema.extend({
    type: z.literal("prompt"),
    url: z.null(),
    content: itemContentSchema,
  }),
  backupFileItemBaseSchema.extend({
    type: z.literal("code_component"),
    url: itemUrlSchema.nullable().optional(),
    content: itemContentSchema,
  }),
]);

/**
 * Valida o arquivo inteiro no navegador antes de qualquer envio. Aceita
 * qualquer versão em SUPPORTED_BACKUP_VERSIONS (1.0 e 1.1) -- um arquivo
 * antigo continua restaurável, só sem description/createdAt de tag.
 */
export const backupFileSchema = z
  .object({
    version: z.enum(SUPPORTED_BACKUP_VERSIONS),
    exportedAt: timestampSchema,
    tags: z.array(backupFileTagSchema).max(MAX_BACKUP_TAGS),
    items: z.array(backupFileItemSchema).max(MAX_BACKUP_ITEMS),
  })
  .superRefine(({ tags, items }, ctx) => {
    const ids = new Set(tags.map((tag) => tag.id));
    if (ids.size !== tags.length)
      ctx.addIssue({ code: "custom", message: "Tags repetidas no arquivo." });
    for (const tag of tags) {
      if (tag.parentId === tag.id)
        ctx.addIssue({
          code: "custom",
          message: "Uma tag não pode ser pai de si mesma.",
        });
      if (tag.parentId && !ids.has(tag.parentId))
        ctx.addIssue({
          code: "custom",
          message: "Hierarquia de tags inválida.",
        });
    }
    for (const item of items) {
      for (const tagId of item.tagIds) {
        if (!ids.has(tagId))
          ctx.addIssue({
            code: "custom",
            message: "Item referencia uma tag inexistente.",
          });
      }
    }
  });

export type BackupFile = z.infer<typeof backupFileSchema>;

const backupTagPayloadSchema = z.object({
  key: z.uuid(),
  parentKey: z.uuid().nullable(),
  name: tagNameSchema,
  colorToken: tagColorSchema,
  description: tagDescriptionSchema,
  createdAt: timestampSchema.nullable(),
});

const backupItemPayloadBaseSchema = z.object({
  title: itemTitleSchema,
  description: itemDescriptionSchema,
  createdAt: timestampSchema,
  tagKeys: tagIdsSchema,
});

const backupItemPayloadSchema = z.discriminatedUnion("type", [
  backupItemPayloadBaseSchema.extend({
    type: z.literal("link"),
    url: itemUrlSchema,
    content: z.null(),
  }),
  backupItemPayloadBaseSchema.extend({
    type: z.literal("prompt"),
    url: z.null(),
    content: itemContentSchema,
  }),
  backupItemPayloadBaseSchema.extend({
    type: z.literal("code_component"),
    url: itemUrlSchema.nullable().optional(),
    content: itemContentSchema,
  }),
]);

/**
 * Fronteira de confiança da Server Action. Valida o payload inteiro que a
 * RPC vai processar numa única transação. O cliente envia os dados brutos
 * validados; a normalização da URL (normalizedUrl) é feita no servidor,
 * evitando a duplicação de normalizedUrl no transporte de rede e mantendo o
 * payload seguro e dentro do limite configurado para a Server Action.
 */
export const backupPayloadSchema = z
  .object({
    tags: z.array(backupTagPayloadSchema).max(MAX_BACKUP_TAGS),
    items: z.array(backupItemPayloadSchema).max(MAX_BACKUP_ITEMS),
  })
  .superRefine(({ tags, items }, ctx) => {
    const keys = new Set(tags.map((tag) => tag.key));
    if (keys.size !== tags.length)
      ctx.addIssue({ code: "custom", message: "Tags repetidas no payload." });
    for (const tag of tags) {
      if (tag.parentKey && !keys.has(tag.parentKey))
        ctx.addIssue({
          code: "custom",
          message: "Hierarquia de tags inválida.",
        });
    }
    for (const item of items) {
      if (item.type === "link" && !normalizeHttpUrl(item.url)) {
        ctx.addIssue({ code: "custom", message: "URL do link é inválida." });
      }
      if (
        item.type === "code_component" &&
        item.url &&
        !normalizeHttpUrl(item.url)
      ) {
        ctx.addIssue({
          code: "custom",
          message: "URL do code component é inválida.",
        });
      }
      for (const key of item.tagKeys) {
        if (!keys.has(key))
          ctx.addIssue({
            code: "custom",
            message: "Tag do item ausente no payload.",
          });
      }
    }
  });

export type BackupPayloadInput = z.infer<typeof backupPayloadSchema>;
