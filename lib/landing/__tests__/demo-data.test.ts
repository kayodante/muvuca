import { describe, it, expect } from "vitest";
import {
  DEMO_TAGS,
  DEMO_ITEMS,
  getItemsForTag,
  getDescendantTagIds,
} from "@/lib/landing/demo-data";

describe("Landing Page Demo Data", () => {
  it("contains valid tags hierarchy with colors and counters", () => {
    expect(DEMO_TAGS.length).toBeGreaterThan(0);
    const skillsTag = DEMO_TAGS.find((t) => t.id === "skills");
    expect(skillsTag).toBeDefined();
    expect(skillsTag?.colorToken).toBe("lime");
    expect(skillsTag?.count).toBe(128);
  });

  it("calculates descendant tags correctly", () => {
    const skillsDescendants = getDescendantTagIds("skills");
    expect(skillsDescendants).toContain("skills");
    expect(skillsDescendants).toContain("design");
    expect(skillsDescendants).toContain("branding");
    expect(skillsDescendants).toContain("desenvolvimento");
    expect(skillsDescendants).toContain("frontend");
  });

  it("aggregates descendant items without duplicates when parent tag is selected (Tag Rollup)", () => {
    const skillsItems = getItemsForTag("skills");
    expect(skillsItems.length).toBeGreaterThan(0);
    const itemIds = skillsItems.map((i) => i.id);
    const uniqueIds = new Set(itemIds);
    expect(itemIds.length).toBe(uniqueIds.size);
  });

  it("contains both link and prompt items with valid properties", () => {
    const links = DEMO_ITEMS.filter((i) => i.type === "link");
    const prompts = DEMO_ITEMS.filter((i) => i.type === "prompt");
    expect(links.length).toBeGreaterThan(0);
    expect(prompts.length).toBeGreaterThan(0);
    expect(links[0]?.url).toMatch(/^https?:\/\//);
    expect(prompts[0]?.contentPreview).toBeDefined();
  });
});
