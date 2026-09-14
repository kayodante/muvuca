import { describe, expect, it } from "vitest";

import { CODE_LANGUAGE_LABELS, CODE_LANGUAGES } from "./languages";

describe("CODE_LANGUAGES", () => {
  it("contains exactly the 13 supported languages in canonical order", () => {
    expect([...CODE_LANGUAGES]).toEqual([
      "typescript",
      "javascript",
      "tsx",
      "html",
      "css",
      "python",
      "sql",
      "json",
      "bash",
      "go",
      "rust",
      "markdown",
      "yaml",
    ]);
  });
});

describe("CODE_LANGUAGE_LABELS", () => {
  it("has a label for every language and no extras", () => {
    expect(Object.keys(CODE_LANGUAGE_LABELS).sort()).toEqual(
      [...CODE_LANGUAGES].sort(),
    );
  });

  it("labels are non-empty and distinct", () => {
    const labels = Object.values(CODE_LANGUAGE_LABELS);
    for (const label of labels) {
      expect(label.trim().length).toBeGreaterThan(0);
    }
    expect(new Set(labels).size).toBe(labels.length);
  });
});
