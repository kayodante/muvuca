import { describe, expect, it } from "vitest";

import {
  createItemSchema,
  normalizeHttpUrl,
  updateItemSchema,
} from "@/lib/validation/item";

const tagId = "11111111-1111-4111-8111-111111111111";

describe("item validation", () => {
  it("normalizes http(s) URLs without fetching them", () => {
    expect(normalizeHttpUrl("HTTPS://Example.com:443/path?q=1")).toBe(
      "https://example.com/path?q=1",
    );
    expect(normalizeHttpUrl("javascript:alert(1)")).toBeNull();
  });

  it("accepts a link with tags", () => {
    const parsed = createItemSchema.safeParse({
      type: "link",
      title: "Example",
      url: "https://example.com",
      description: "",
      tagIds: [tagId],
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.description).toBeNull();
  });

  it("requires content for prompts and rejects duplicate tags", () => {
    expect(
      createItemSchema.safeParse({
        type: "prompt",
        title: "Blank",
        content: "   ",
        description: "",
        tagIds: [],
      }).success,
    ).toBe(false);
    expect(
      createItemSchema.safeParse({
        type: "prompt",
        title: "Duplicate tags",
        content: "Use this prompt",
        description: "",
        tagIds: [tagId, tagId],
      }).success,
    ).toBe(false);
  });

  it("requires an item id on edits", () => {
    expect(
      updateItemSchema.safeParse({
        type: "prompt",
        title: "Prompt",
        content: "Text",
        description: "",
        tagIds: [],
      }).success,
    ).toBe(false);
  });

  describe("code_component validation", () => {
    it("accepts code component without URL (undefined or null)", () => {
      const parsedUndefined = createItemSchema.safeParse({
        type: "code_component",
        title: "Button Component",
        content: "export function Button() { return <button />; }",
        description: "A simple button",
        tagIds: [tagId],
      });
      expect(parsedUndefined.success).toBe(true);

      const parsedNull = createItemSchema.safeParse({
        type: "code_component",
        title: "Button Component",
        content: "export function Button() { return <button />; }",
        url: null,
        description: "",
        tagIds: [tagId],
      });
      expect(parsedNull.success).toBe(true);
      if (parsedNull.success) {
        expect(parsedNull.data.type).toBe("code_component");
      }
    });

    it("accepts code component with valid URL", () => {
      const parsed = createItemSchema.safeParse({
        type: "code_component",
        title: "Button Component",
        content: "export function Button() { return <button />; }",
        url: "https://example.com/components/button",
        description: "UI Button",
        tagIds: [],
      });
      expect(parsed.success).toBe(true);
      if (parsed.success && parsed.data.type === "code_component") {
        expect(parsed.data.url).toBe("https://example.com/components/button");
      }
    });

    it("rejects code component without content or with empty content", () => {
      expect(
        createItemSchema.safeParse({
          type: "code_component",
          title: "Empty Component",
          content: "   ",
          description: null,
          tagIds: [],
        }).success,
      ).toBe(false);

      expect(
        createItemSchema.safeParse({
          type: "code_component",
          title: "Missing Content Component",
          description: null,
          tagIds: [],
        }).success,
      ).toBe(false);
    });

    it("rejects code component with invalid URL", () => {
      expect(
        createItemSchema.safeParse({
          type: "code_component",
          title: "Invalid URL Component",
          content: "const a = 1;",
          url: "javascript:alert(1)",
          description: null,
          tagIds: [],
        }).success,
      ).toBe(false);
    });

    it("validates updateItemSchema for code_component", () => {
      const itemId = "22222222-2222-4222-8222-222222222222";
      const parsed = updateItemSchema.safeParse({
        id: itemId,
        type: "code_component",
        title: "Updated Component",
        content: "export default () => <div />;",
        url: "https://example.com/comp",
        description: "Updated",
        tagIds: [tagId],
      });
      expect(parsed.success).toBe(true);

      // Rejects without ID
      expect(
        updateItemSchema.safeParse({
          type: "code_component",
          title: "Updated Component",
          content: "export default () => <div />;",
          url: "https://example.com/comp",
          description: "Updated",
          tagIds: [tagId],
        }).success,
      ).toBe(false);
    });
  });
});
