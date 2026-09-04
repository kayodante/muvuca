import { describe, expect, it } from "vitest";

import { indentClassFor } from "./indent";

describe("indentClassFor", () => {
  it("steps once per level", () => {
    expect(indentClassFor(0)).toBe("pl-0");
    expect(indentClassFor(1)).toBe("pl-4");
    expect(indentClassFor(5)).toBe("pl-20");
  });

  it("clamps instead of returning undefined outside the tree depth", () => {
    expect(indentClassFor(-1)).toBe("pl-0");
    expect(indentClassFor(99)).toBe("pl-20");
  });
});
