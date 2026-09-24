import { z } from "zod";

/** Curated tag palette. */
export const TAG_COLOR_TOKENS = [
  "lime",
  "chartreuse",
  "yellow",
  "amber",
  "orange",
  "peach",
  "terracotta",
  "brown",
  "red",
  "rose",
  "coral",
  "pink",
  "fuchsia",
  "purple",
  "lavender",
  "violet",
  "indigo",
  "periwinkle",
  "blue",
  "sky",
  "cyan",
  "aqua",
  "teal",
  "emerald",
  "mint",
  "green",
  "slate",
  "zinc",
  "stone",
] as const;

export type TagColorToken = (typeof TAG_COLOR_TOKENS)[number];

export const tagColorSchema = z.enum(TAG_COLOR_TOKENS);

export const TAG_NAME_MAX_LENGTH = 80;

export const tagNameSchema = z.string().trim().min(1).max(TAG_NAME_MAX_LENGTH);

/**
 * Empty string means "no description" in a form submit; normalized to
 * `null` before it ever reaches the schema's own length check so an empty
 * field never trips `max(500)` or gets stored as `""` instead of `null`.
 */
export const tagDescriptionSchema = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.string().trim().max(500).nullable(),
);

/**
 * Empty string means "no parent" (root tag) in a form submit, same
 * normalization as description above.
 */
export const tagParentIdSchema = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.uuid().nullable(),
);

export const createTagSchema = z.object({
  name: tagNameSchema,
  description: tagDescriptionSchema,
  colorToken: tagColorSchema,
  parentId: tagParentIdSchema,
});

export const updateTagSchema = createTagSchema.extend({
  id: z.uuid(),
});

export const deleteTagSchema = z.object({
  id: z.uuid(),
});
