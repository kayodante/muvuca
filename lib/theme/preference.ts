import { z } from "zod";

/** The default for users without a saved preference. */
export const DEFAULT_THEME = "system";

export const themeSchema = z.enum(["system", "light", "dark"]);

export type Theme = z.infer<typeof themeSchema>;
