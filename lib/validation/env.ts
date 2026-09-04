import { z } from "zod";

/**
 * Bootstrap env validation. Only the three publishable variables are
 * allowed on NEXT_PUBLIC_ -- anything else exposed there would ship a
 * secret to the browser bundle.
 */
const envSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
      .string()
      .regex(/^sb_publishable_[A-Za-z0-9_-]+$/, "Must be a publishable key"),
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  })
  .superRefine((env, context) => {
    for (const key of [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_APP_URL",
    ] as const) {
      const url = new URL(env[key]);

      if (
        url.username ||
        url.password ||
        url.pathname !== "/" ||
        url.search ||
        url.hash
      ) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: "Must be an origin without credentials, path, query or hash",
        });
      }

      const isLocalOrigin =
        url.hostname === "localhost" || url.hostname === "127.0.0.1";

      if (url.protocol !== "https:" && !isLocalOrigin) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: "Must use HTTPS outside local development",
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

/**
 * Validates `process.env` against the schema and caches the result.
 * Throws with an aggregated, non-sensitive message on failure — callers
 * at bootstrap (see `instrumentation.ts`) are expected to let this crash
 * the process rather than run with an incomplete configuration.
 */
export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

/** Test-only hook to reset the module cache between assertions. */
export function __resetEnvCacheForTests(): void {
  cachedEnv = undefined;
}
