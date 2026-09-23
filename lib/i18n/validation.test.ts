import { describe, expect, it } from "vitest";
import { dictionaries } from "./dictionaries";
import { translateFieldErrors, translateIssue } from "./validation";

const t = dictionaries["pt-BR"];

describe("translateIssue", () => {
  it("translates a known validation key", () => {
    expect(translateIssue("required", t)).toBe(t.validation.required);
  });

  it("falls back to validation.invalid for an unknown key (default Zod message)", () => {
    expect(
      translateIssue("String must contain at least 1 character(s)", t),
    ).toBe(t.validation.invalid);
  });
});

describe("translateFieldErrors", () => {
  it("translates every message for every field, keeping the shape", () => {
    const result = translateFieldErrors(
      { name: ["required"], email: ["required", "not-a-real-key"] },
      t,
    );

    expect(result).toEqual({
      name: [t.validation.required],
      email: [t.validation.required, t.validation.invalid],
    });
  });

  it("returns an empty object for no field errors", () => {
    expect(translateFieldErrors({}, t)).toEqual({});
  });
});
