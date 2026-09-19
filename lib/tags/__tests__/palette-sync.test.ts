import { describe, expect, it } from "vitest";

import { latestConstraintValues } from "@/lib/testing/migration-constraints";
import { TAG_COLOR_TOKENS } from "@/lib/validation/tag";

const CONSTRAINT_PATTERN =
  /tags_color_token_allowed\s+check\s*\(\s*color_token\s+in\s*\(([^)]*)\)/g;

describe("tag palette", () => {
  it("matches the tags_color_token_allowed check constraint", () => {
    expect(latestConstraintValues(CONSTRAINT_PATTERN).sort()).toEqual(
      [...TAG_COLOR_TOKENS].sort(),
    );
  });
});
