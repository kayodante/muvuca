export interface ExportTag {
  id: string;
  name: string;
  colorToken: string;
  parentId: string | null;
  /** Adicionado na versão 1.1 do formato; ausente em arquivos 1.0. */
  description: string | null;
  /** Adicionado na versão 1.1 do formato; ausente em arquivos 1.0. */
  createdAt: string;
}

export interface ExportItem {
  id: string;
  type: "link" | "prompt" | "code_component";
  title: string;
  url: string | null;
  description: string | null;
  content: string | null;
  tagIds: string[];
  createdAt: string;
}

/**
 * Versão do formato de backup JSON que o exportador grava agora. Um arquivo
 * com versão desconhecida é rejeitado em vez de adivinhado.
 *
 * 1.1 acrescenta `description` e `createdAt` em cada tag, porque o
 * round-trip de export→import perdia a descrição autoral da tag. O
 * significado de "1.0" não muda -- arquivos 1.0 continuam válidos para
 * importação, só não carregam esses dois campos.
 */
export const BACKUP_FORMAT_VERSION = "1.1" as const;

/** Versões que o importador aceita ler, da mais antiga à mais nova. */
export const SUPPORTED_BACKUP_VERSIONS = ["1.0", "1.1"] as const;

export interface ExportData {
  version: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
  tags: ExportTag[];
  items: ExportItem[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatAsNetscapeBookmarks(data: ExportData): string {
  const linkItems = data.items.filter(
    (item) => item.type === "link" && Boolean(item.url),
  );

  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file. It will be read and overwritten. Do Not Edit! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>\n`;

  // Construir mapa de tags por parentId
  const tagsByParent = new Map<string | null, ExportTag[]>();
  for (const tag of data.tags) {
    const list = tagsByParent.get(tag.parentId) ?? [];
    list.push(tag);
    tagsByParent.set(tag.parentId, list);
  }

  function renderTagBranch(
    parentId: string | null,
    indentLevel: number,
  ): string {
    const children = tagsByParent.get(parentId) ?? [];
    let branchHtml = "";
    const indent = "    ".repeat(indentLevel);

    for (const tag of children) {
      branchHtml += `${indent}<DT><H3>${escapeHtml(tag.name)}</H3>\n`;
      branchHtml += `${indent}<DL><p>\n`;

      // Renderizar links que possuem esta tag
      const taggedLinks = linkItems.filter((i) => i.tagIds.includes(tag.id));
      for (const link of taggedLinks) {
        branchHtml += `${indent}    <DT><A HREF="${escapeHtml(link.url!)}">${escapeHtml(link.title)}</A>\n`;
      }

      // Renderizar subtags recursivamente
      branchHtml += renderTagBranch(tag.id, indentLevel + 1);
      branchHtml += `${indent}</DL><p>\n`;
    }
    return branchHtml;
  }

  html += renderTagBranch(null, 1);

  // Links sem tags
  const untaggedLinks = linkItems.filter((i) => i.tagIds.length === 0);
  for (const link of untaggedLinks) {
    html += `    <DT><A HREF="${escapeHtml(link.url!)}">${escapeHtml(link.title)}</A>\n`;
  }

  html += `</DL><p>\n`;
  return html;
}
