import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

/**
 * Reads the quoted values of a check constraint straight out of the migration
 * files. Used by the sync tests that hold a TypeScript allowlist and its SQL
 * check constraint together -- nothing in the type system connects the two, so
 * a value that exists only on the TypeScript side compiles, renders and passes
 * every other test in the suite, then fails at insert time in production.
 *
 * `pattern` must be a global regex whose first capture group is the value list
 * of the constraint, e.g. `/tags_color_token_allowed\s+check\s*\(\s*color_token\s+in\s*\(([^)]*)\)/g`.
 */
export function latestConstraintValues(pattern: RegExp): string[] {
  // Migration filenames are timestamp-prefixed, so lexicographic order is
  // chronological and the last definition wins -- same as in the database,
  // where a later migration can drop and re-add the constraint.
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  let latest: string | null = null;
  for (const file of files) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    for (const match of sql.matchAll(pattern)) {
      latest = match[1] ?? latest;
    }
  }

  if (latest === null) {
    throw new Error(
      `No constraint matching ${pattern.source} found in supabase/migrations`,
    );
  }

  return [...latest.matchAll(/'([^']+)'/g)].flatMap((match) =>
    match[1] ? [match[1]] : [],
  );
}
