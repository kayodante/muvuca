import { z } from "zod";

import {
  MAX_BOOKMARK_FOLDERS,
  MAX_BOOKMARKS,
  MAX_BOOKMARKS_PER_BATCH,
} from "./types";
import {
  normalizeHttpUrl,
  itemTitleSchema,
  itemUrlSchema,
} from "@/lib/validation/item";
import { tagNameSchema } from "@/lib/validation/tag";

const keySchema = z
  .string()
  .regex(/^tag_[1-9]\d*$/)
  .max(12);

export const bookmarkTagSchema = z.object({
  key: keySchema,
  parentKey: keySchema.nullable(),
  name: tagNameSchema,
});

export const bookmarkItemSchema = z
  .object({
    title: itemTitleSchema,
    url: itemUrlSchema,
    normalizedUrl: itemUrlSchema,
    tagKey: keySchema.nullable(),
  })
  .refine(({ url, normalizedUrl }) => normalizeHttpUrl(url) === normalizedUrl, {
    message: "URL normalizada inválida.",
  });

export const bookmarkImportSchema = z
  .object({
    tags: z.array(bookmarkTagSchema).max(MAX_BOOKMARK_FOLDERS),
    items: z.array(bookmarkItemSchema).min(1).max(MAX_BOOKMARKS_PER_BATCH),
    // No upper bound: this field is informational only (feeds the "Ignorados"
    // summary) and the parser doesn't cap it -- capping it here would let a
    // large-but-legitimate count reject the entire otherwise-valid batch.
    // Validation should fail closed on real errors, never on a display
    // counter.
    invalidCount: z.number().int().min(0),
  })
  .superRefine(({ tags, items }, ctx) => {
    const keys = new Set(tags.map((tag) => tag.key));
    if (keys.size !== tags.length)
      ctx.addIssue({ code: "custom", message: "Pastas repetidas." });
    for (const tag of tags) {
      if (tag.parentKey && !keys.has(tag.parentKey))
        ctx.addIssue({
          code: "custom",
          message: "Hierarquia de pastas inválida.",
        });
    }
    for (const item of items) {
      if (item.tagKey && !keys.has(item.tagKey))
        ctx.addIssue({
          code: "custom",
          message: "Pasta do favorito inválida.",
        });
    }
  });

export const bookmarkUrlsSchema = z.array(itemUrlSchema).max(MAX_BOOKMARKS);
