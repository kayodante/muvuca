import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CODE_LANGUAGES } from "@/lib/code/languages";

/**
 * The language allowlist is written down twice: as `CODE_LANGUAGES` and as
 * the `library_items_language_allowed` check constraint in SQL. Nothing in
 * the type system connects the two, so a language that exists only on the
 * TypeScript side compiles, renders and passes every other test in the
 * suite -- it fails at insert time, in production, for whichever user
 * happens to pick it. This test is the only thing holding the two lists
 * together.
 */
const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

const CONSTRAINT_PATTERN =
  /library_items_language_allowed\s+check\s*\(\s*language\s+is\s+null\s+or\s+language\s+in\s*\(([^)]*)\)/g;

function languagesFromLatestConstraint(): string[] {
  // Migration filenames are timestamp-prefixed, so lexicographic order is
  // chronological and the last definition wins -- same as in the database,
  // where a later migration can drop and re-add the constraint.
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  let latest: string | null = null;
  for (const file of files) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    for (const match of sql.matchAll(CONSTRAINT_PATTERN)) {
      latest = match[1] ?? latest;
    }
  }

  if (latest === null) {
    throw new Error(
      "No library_items_language_allowed constraint found in supabase/migrations",
    );
  }

  return [...latest.matchAll(/'([^']+)'/g)].flatMap((match) =>
    match[1] ? [match[1]] : [],
  );
}

describe("code language allowlist", () => {
  it("matches the library_items_language_allowed check constraint", () => {
    expect(languagesFromLatestConstraint().sort()).toEqual(
      [...CODE_LANGUAGES].sort(),
    );
  });
});
