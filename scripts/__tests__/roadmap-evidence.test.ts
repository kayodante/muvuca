import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * `ROADMAP.md` closes each phase by pointing at the file that proves it: a
 * pgTAP case, an e2e spec, a job in `ci.yml`. That evidence is the whole
 * value of its state table -- a pointer to a file that was renamed or deleted
 * reads exactly like a pointer to a passing test, and the document goes back
 * to being prose nobody can execute.
 *
 * The roadmap is a planning document kept out of the published repository, so
 * this suite skips itself where the file is absent and guards the working
 * copies that do have it. If the roadmap is ever published, the check starts
 * running in CI on its own.
 *
 * ponytail: only backticked paths are checked. A renamed CI *step* still
 * slips through; if that starts happening, match the step names against
 * `.github/workflows/ci.yml` here too.
 */
const ROADMAP = path.join(process.cwd(), "ROADMAP.md");

// A repo path has a directory separator plus either a file extension or a
// trailing slash: that is what separates `e2e/tags.spec.ts` and
// `lib/metadata/` from `next/font` or a property access like `window.opener`.
const PATH_LIKE = /^[\w.-]+(?:\/[\w.@-]+)*(?:\/|\/[\w.@-]+\.\w+)$/;

function citedPaths(): string[] {
  const md = readFileSync(ROADMAP, "utf8");
  const cited = [...md.matchAll(/`([^`\n]+)`/g)].flatMap((match) =>
    match[1] ? [match[1]] : [],
  );

  return [...new Set(cited.filter((value) => PATH_LIKE.test(value)))];
}

describe.skipIf(!existsSync(ROADMAP))("ROADMAP evidence", () => {
  it("points only at files that exist", () => {
    const missing = citedPaths().filter(
      (cited) => !existsSync(path.join(process.cwd(), cited)),
    );

    expect(missing).toEqual([]);
  });

  it("finds the paths it is supposed to check", () => {
    const paths = citedPaths();

    expect(paths).toContain("supabase/tests/01_ownership_rls.sql");
    expect(paths).toContain(".github/workflows/ci.yml");
    expect(paths).not.toContain("next/font");
  });
});
