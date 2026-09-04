import { describe, expect, it } from "vitest";
import {
  BACKUP_FORMAT_VERSION,
  formatAsNetscapeBookmarks,
  type ExportData,
} from "../formatter";

const mockExportData: ExportData = {
  version: "1.1",
  exportedAt: "2026-08-15T12:00:00Z",
  tags: [
    {
      id: "tag-1",
      name: "Design",
      colorToken: "lime",
      parentId: null,
      description: null,
      createdAt: "2026-08-10T00:00:00Z",
    },
    {
      id: "tag-2",
      name: "UI",
      colorToken: "blue",
      parentId: "tag-1",
      description: null,
      createdAt: "2026-08-10T00:00:00Z",
    },
  ],
  items: [
    {
      id: "item-1",
      type: "link",
      title: "Muvuca Design",
      url: "https://example.com/design",
      description: "Artigo sobre design",
      content: null,
      tagIds: ["tag-2"],
      createdAt: "2026-08-14T00:00:00Z",
    },
    {
      id: "item-2",
      type: "prompt",
      title: "Prompt de Refatoração",
      url: null,
      description: null,
      content: "Refatore este código.",
      tagIds: ["tag-1"],
      createdAt: "2026-08-14T00:00:00Z",
    },
  ],
};

describe("formatAsNetscapeBookmarks", () => {
  it("converte os links e estrutura de pastas em formato HTML Netscape válido", () => {
    const html = formatAsNetscapeBookmarks(mockExportData);

    expect(html).toContain("<!DOCTYPE NETSCAPE-Bookmark-file-1>");
    expect(html).toContain("<DT><H3>Design</H3>");
    expect(html).toContain("<DT><H3>UI</H3>");
    expect(html).toContain('HREF="https://example.com/design"');
    expect(html).toContain("Muvuca Design");
  });

  it('escapa caracteres especiais HTML (&, <, >, ") em nomes de tags, títulos e URLs', () => {
    const dataWithSpecialChars: ExportData = {
      version: "1.1",
      exportedAt: "2026-08-15T12:00:00Z",
      tags: [
        {
          id: "tag-special",
          name: "Design & <Code>",
          colorToken: "lime",
          parentId: null,
          description: null,
          createdAt: "2026-08-10T00:00:00Z",
        },
      ],
      items: [
        {
          id: "item-special",
          type: "link",
          title: 'Article: "Special & Cool" <Guide>',
          url: "https://example.com/item?foo=1&bar=2",
          description: null,
          content: null,
          tagIds: ["tag-special"],
          createdAt: "2026-08-14T00:00:00Z",
        },
      ],
    };

    const html = formatAsNetscapeBookmarks(dataWithSpecialChars);
    expect(html).toContain("<DT><H3>Design &amp; &lt;Code&gt;</H3>");
    expect(html).toContain(
      "Article: &quot;Special &amp; Cool&quot; &lt;Guide&gt;",
    );
    expect(html).toContain('HREF="https://example.com/item?foo=1&amp;bar=2"');
  });

  it("renderiza links sem tags na raiz do documento", () => {
    const dataWithUntagged: ExportData = {
      version: "1.1",
      exportedAt: "2026-08-15T12:00:00Z",
      tags: [],
      items: [
        {
          id: "item-untagged",
          type: "link",
          title: "Untagged Link",
          url: "https://example.com/untagged",
          description: null,
          content: null,
          tagIds: [],
          createdAt: "2026-08-14T00:00:00Z",
        },
      ],
    };

    const html = formatAsNetscapeBookmarks(dataWithUntagged);
    expect(html).toContain('HREF="https://example.com/untagged"');
    expect(html).toContain("Untagged Link");
  });

  it("ignora itens do tipo prompt no HTML Netscape mas mantém links", () => {
    const dataWithPrompts: ExportData = {
      version: "1.1",
      exportedAt: "2026-08-15T12:00:00Z",
      tags: [],
      items: [
        {
          id: "item-prompt",
          type: "prompt",
          title: "Prompt Only",
          url: null,
          description: null,
          content: "Prompt content",
          tagIds: [],
          createdAt: "2026-08-14T00:00:00Z",
        },
      ],
    };

    const html = formatAsNetscapeBookmarks(dataWithPrompts);
    expect(html).not.toContain("Prompt Only");
    expect(html).not.toContain("Prompt content");
  });

  it("ignora itens do tipo code_component no HTML Netscape mas mantém links", () => {
    const dataWithCodeComponent: ExportData = {
      version: "1.1",
      exportedAt: "2026-08-15T12:00:00Z",
      tags: [],
      items: [
        {
          id: "item-code",
          type: "code_component",
          title: "Code Component Button",
          url: "https://example.com/component",
          description: null,
          content: "export const Button = () => null;",
          tagIds: [],
          createdAt: "2026-08-14T00:00:00Z",
        },
      ],
    };

    const html = formatAsNetscapeBookmarks(dataWithCodeComponent);
    expect(html).not.toContain("Code Component Button");
    expect(html).not.toContain("https://example.com/component");
    expect(html).not.toContain("export const Button = () => null;");
  });
});

describe("BACKUP_FORMAT_VERSION", () => {
  it("é a versão que o exportador grava no arquivo", () => {
    expect(BACKUP_FORMAT_VERSION).toBe("1.1");
  });
});
