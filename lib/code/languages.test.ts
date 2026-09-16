import { describe, expect, it } from "vitest";

import {
  CODE_LANGUAGE_LABELS,
  CODE_LANGUAGES,
  isCodeLanguage,
} from "./languages";

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

describe("isCodeLanguage", () => {
  it("accepts every supported language", () => {
    for (const language of CODE_LANGUAGES) {
      expect(isCodeLanguage(language)).toBe(true);
    }
  });

  it("rejects unsupported strings, non-strings and null-ish values", () => {
    expect(isCodeLanguage("cobol")).toBe(false);
    expect(isCodeLanguage("TypeScript")).toBe(false);
    expect(isCodeLanguage("")).toBe(false);
    expect(isCodeLanguage(null)).toBe(false);
    expect(isCodeLanguage(undefined)).toBe(false);
    expect(isCodeLanguage(42)).toBe(false);
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
