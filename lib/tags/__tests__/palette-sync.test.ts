import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { TAG_COLOR_TOKENS } from "@/lib/validation/tag";

/**
 * The palette is written down twice: as `TAG_COLOR_TOKENS` and as the
 * `tags_color_token_allowed` check constraint in SQL. Nothing in the type
 * system connects the two, so a token that exists only on the TypeScript side
 * compiles, renders and passes every other test in the suite -- it fails at
 * insert time, in production, for whichever user happens to land on it. This
 * test is the only thing holding the two lists together.
 */
const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

const CONSTRAINT_PATTERN =
  /tags_color_token_allowed\s+check\s*\(\s*color_token\s+in\s*\(([^)]*)\)/g;

function tokensFromLatestConstraint(): string[] {
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
      "No tags_color_token_allowed constraint found in supabase/migrations",
    );
  }

  return [...latest.matchAll(/'([^']+)'/g)].flatMap((match) =>
    match[1] ? [match[1]] : [],
  );
}

describe("tag palette", () => {
  it("matches the tags_color_token_allowed check constraint", () => {
    expect(tokensFromLatestConstraint().sort()).toEqual(
      [...TAG_COLOR_TOKENS].sort(),
    );
  });
});
