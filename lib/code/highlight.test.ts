import { describe, expect, it } from "vitest";

import { highlightCode, toPlainLines } from "./highlight";
import type { CodeLanguage } from "./languages";

function joinLine(line: Awaited<ReturnType<typeof highlightCode>>[number]) {
  return line.map((token) => token.content).join("");
}

describe("highlightCode", () => {
  it("returns token lines with CSS-variable colors for a known language", async () => {
    const lines = await highlightCode("const x = 1", "typescript");

    expect(lines.length).toBeGreaterThan(0);
    const tokens = lines.flat();
    expect(tokens.length).toBeGreaterThan(1);
    expect(tokens.some((token) => token.color?.startsWith("var(--code-"))).toBe(
      true,
    );
    // Reconstructing the lines from token contents gives back the source.
    expect(lines.map(joinLine).join("\n")).toBe("const x = 1");
  });

  it("returns plain lines without color when language is null", async () => {
    await expect(highlightCode("const x = 1", null)).resolves.toEqual([
      [{ content: "const x = 1" }],
    ]);
  });

  it("falls back to plain lines for an unknown language string", async () => {
    // Cannot happen through the type system; only via untyped input leaking
    // past the boundary (e.g. a stale database value).
    const bogus = "cobol" as CodeLanguage;
    await expect(highlightCode("const x = 1", bogus)).resolves.toEqual([
      [{ content: "const x = 1" }],
    ]);
  });

  it.each([
    ["backticks and template interpolation", "const s = `hi ${name}`;"],
    ["heredoc-like strange braces", "const x = { [Symbol()]: `}` };"],
    ["literal script tags", 'const html = "<script></script>";'],
    ["markdown fences", "```ts\nconst a = 1\n```\n\n<em>raw</em> ${not{real}}"],
  ])("tokenizes %s without throwing", async (_label, code) => {
    const lines = await highlightCode(code, "typescript");
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.map(joinLine).join("\n")).toBe(code);
  });

  it("returns a single line with an empty string for empty input", async () => {
    await expect(highlightCode("", "typescript")).resolves.toEqual([
      [{ content: "" }],
    ]);
    await expect(highlightCode("", null)).resolves.toEqual([[{ content: "" }]]);
  });

  it("splits multi-line input into one CodeLine per source line", async () => {
    const code = "const a = 1\nconst b = 2\nconst c = 3";
    const lines = await highlightCode(code, "typescript");
    expect(lines).toHaveLength(3);
    expect(lines.map(joinLine)).toEqual([
      "const a = 1",
      "const b = 2",
      "const c = 3",
    ]);
  });

  it("treats a trailing newline consistently in highlighted and plain paths", async () => {
    const code = "const a = 1\n";
    const highlighted = await highlightCode(code, "typescript");
    const plain = await highlightCode(code, null);
    expect(highlighted.map(joinLine)).toEqual(["const a = 1"]);
    expect(plain.map(joinLine)).toEqual(highlighted.map(joinLine));
  });
});

describe("toPlainLines", () => {
  it("trata um `\n` final como fim da última linha, não uma linha a mais", () => {
    expect(toPlainLines("const a = 1\n")).toEqual([
      [{ content: "const a = 1" }],
    ]);
    expect(toPlainLines("a\n\n")).toEqual([
      [{ content: "a" }],
      [{ content: "" }],
    ]);
    expect(toPlainLines("")).toEqual([[{ content: "" }]]);
  });
});
