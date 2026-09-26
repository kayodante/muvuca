import { describe, expect, it } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  it("keeps a type-scale class next to a text color", () => {
    expect(cn("text-label-md", "text-muted-foreground")).toBe(
      "text-label-md text-muted-foreground",
    );
  });

  it("still lets a later type-scale class replace an earlier one", () => {
    expect(cn("text-body-sm", "text-label-md")).toBe("text-label-md");
  });
});
