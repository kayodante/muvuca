import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { PREVIEW_ERROR_CODES, isPermanent } from "@/lib/metadata/errors";

/**
 * "Permanent preview error" is defined four times: `isPermanent()` in
 * TypeScript, and a `coalesce((p_)?error_code, '') not in (...)` clause
 * repeated in `is_preview_job_claimable()`, `complete_preview_job()` (both
 * in `20260819000000_0023_link_previews.sql`, most recently redefined by
 * `20260819010000_0023_link_previews_permanent_error_parity.sql`), and
 * `request_preview_reschedule_for_items()` (`20260825000000_0024_scoped_preview_queue.sql`).
 * Nothing in the type system connects the four -- a code classified
 * permanent only on the TypeScript side would keep getting silently
 * reclaimed/reschedulable on the SQL side forever.
 * This test is the only thing holding all four in sync.
 */
const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

const FUNCTION_START_PATTERN =
  /create\s+(?:or\s+replace\s+)?function\s+public\.(\w+)/gi;

const NOT_IN_PATTERN =
  /coalesce\((?:p_)?error_code,\s*''\)\s*not in\s*\(([^)]*)\)/gi;

/**
 * Keyed by function name, not by file: migration filenames are
 * timestamp-prefixed, so lexicographic order is chronological, and a later
 * `create or replace function public.<name>` fully supersedes an earlier
 * definition of that SAME function -- exactly like in the database. Keying
 * by file instead (the previous version of this helper) let a later file
 * that touches a *different* function silently blot out an earlier file's
 * entries for functions it never redefined, which is how the drift in
 * `request_preview_reschedule_for_items` (added by 0024) escaped this guard
 * even after its regex learned to see the bare-column clause form.
 */
function permanentCodeListsByFunction(): Map<string, string[]> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const byFunction = new Map<string, string[]>();
  for (const file of files) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const starts = [...sql.matchAll(FUNCTION_START_PATTERN)];
    for (const [i, start] of starts.entries()) {
      const name = start[1];
      if (!name) continue;
      const blockStart = start.index ?? 0;
      const blockEnd = starts[i + 1]?.index ?? sql.length;
      const block = sql.slice(blockStart, blockEnd);

      const match = [...block.matchAll(NOT_IN_PATTERN)][0];
      if (!match) continue;

      const codes = [...(match[1] ?? "").matchAll(/'([^']+)'/g)].flatMap((m) =>
        m[1] ? [m[1]] : [],
      );
      byFunction.set(name, codes);
    }
  }
  return byFunction;
}

describe("preview permanent-error sync", () => {
  it("covers is_preview_job_claimable, complete_preview_job and request_preview_reschedule_for_items", () => {
    const byFunction = permanentCodeListsByFunction();

    // Guards the guard: per-function keying must not collapse back down to
    // "last file wins" -- if this ever drops to fewer than three entries,
    // some function's permanent-error list stopped being checked at all.
    expect(new Set(byFunction.keys())).toEqual(
      new Set([
        "is_preview_job_claimable",
        "complete_preview_job",
        "request_preview_reschedule_for_items",
      ]),
    );
  });

  it("SQL's not-claimable/not-retryable/not-reschedulable lists match isPermanent() exactly", () => {
    const tsPermanent = PREVIEW_ERROR_CODES.filter(isPermanent).sort();
    const byFunction = permanentCodeListsByFunction();

    expect(byFunction.size).toBeGreaterThan(0);
    for (const [, codes] of byFunction) {
      expect(codes.sort()).toEqual(tsPermanent);
    }
  });
});
