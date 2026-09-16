import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Production applies migrations with `supabase db push` (docs/DEPLOY.md),
 * which runs every pending file against a database that holds real user
 * data. There is no PITR and no automatic backup on the Supabase plan this
 * project targets, so a migration that drops a table or a column is not a
 * recoverable mistake -- it is the end of that data.
 *
 * CI cannot catch this on its own: `supabase db reset` applies migrations to
 * an *empty* database, where a destructive statement passes green precisely
 * because there was nothing to destroy. This test is the missing signal.
 *
 * It does not forbid destructive migrations -- some schema changes genuinely
 * need one. It forbids *accidental* ones, by requiring the author to write
 * the acknowledgement below into the file, which is the moment they have to
 * think about the data already sitting in production.
 */
const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

/**
 * Opt-out marker. Deliberately verbose and deliberately requires a reason:
 * a short token would end up pasted in by reflex.
 */
const ACKNOWLEDGEMENT = /--\s*migration:destructive-ok\s+\S+/;

/**
 * Only statements that destroy *data*. `drop function`, `drop policy` and
 * `alter table ... drop constraint` are absent on purpose: this repo already
 * drops and recreates RPCs on every signature change (see
 * 0028_code_item_language.sql), and flagging those would make the check
 * noise that people learn to ignore.
 */
const DESTRUCTIVE = [
  { name: "drop table", pattern: /\bdrop\s+table\b/gi },
  { name: "drop column", pattern: /\bdrop\s+column\b/gi },
  { name: "drop schema", pattern: /\bdrop\s+schema\b/gi },
  { name: "truncate", pattern: /\btruncate\b/gi },
];

/**
 * Blanks out `--` line comments and block comments while keeping every
 * newline, so a match index still maps to the right line number and prose
 * describing a destructive statement does not trip the check.
 */
function stripComments(sql: string): string {
  const keepNewlines = (text: string) => text.replace(/[^\n]/g, " ");
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, keepNewlines)
    .replace(/--[^\n]*/g, keepNewlines);
}

function lineOf(sql: string, index: number): number {
  return sql.slice(0, index).split("\n").length;
}

describe("supabase migrations", () => {
  it("contain no unacknowledged data-destroying statement", () => {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    expect(files.length).toBeGreaterThan(0);

    const violations: string[] = [];

    for (const file of files) {
      const raw = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      if (ACKNOWLEDGEMENT.test(raw)) continue;

      const sql = stripComments(raw);
      for (const { name, pattern } of DESTRUCTIVE) {
        for (const match of sql.matchAll(pattern)) {
          violations.push(`${file}:${lineOf(sql, match.index)}  ${name}`);
        }
      }
    }

    expect(
      violations,
      violations.length === 0
        ? ""
        : `Destructive statement(s) in a migration that production applies to live data:\n\n` +
            violations.map((v) => `  ${v}`).join("\n") +
            `\n\nIf the data loss is intended, export a backup first and add to the migration:\n` +
            `  -- migration:destructive-ok <why this data can go>\n`,
    ).toEqual([]);
  });
});
