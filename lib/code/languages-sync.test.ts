import { describe, expect, it } from "vitest";

import { CODE_LANGUAGES } from "@/lib/code/languages";
import { latestConstraintValues } from "@/lib/testing/migration-constraints";

const CONSTRAINT_PATTERN =
  /library_items_language_allowed\s+check\s*\(\s*language\s+is\s+null\s+or\s+language\s+in\s*\(([^)]*)\)/g;

describe("code language allowlist", () => {
  it("matches the library_items_language_allowed check constraint", () => {
    expect(latestConstraintValues(CONSTRAINT_PATTERN).sort()).toEqual(
      [...CODE_LANGUAGES].sort(),
    );
  });
});
