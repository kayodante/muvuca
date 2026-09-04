import { normalizeHttpUrl } from "@/lib/validation/item";
import type { BackupItemPayload, BackupTagPayload } from "./types";
import type { BackupFile } from "./validation";

export class BackupImportError extends Error {}

/**
 * O export ordena tags por created_at, o que não garante pai antes de filho
 * (basta uma tag antiga ter sido reparentada sob uma tag nova). A RPC resolve
 * parentKey a partir do mapa acumulado, então a ordem precisa ser topológica.
 */
function sortTagsByHierarchy(tags: BackupTagPayload[]): BackupTagPayload[] {
  const byParent = new Map<string | null, BackupTagPayload[]>();
  for (const tag of tags) {
    const siblings = byParent.get(tag.parentKey) ?? [];
    siblings.push(tag);
    byParent.set(tag.parentKey, siblings);
  }

  const ordered: BackupTagPayload[] = [];
  function walk(parentKey: string | null): void {
    for (const tag of byParent.get(parentKey) ?? []) {
      ordered.push(tag);
      walk(tag.key);
    }
  }
  walk(null);

  // Toda tag alcançável a partir de uma raiz entra em `ordered`. Sobra
  // significa ciclo -- impossível pelo trigger do banco na origem, mas o
  // arquivo pode ter sido editado à mão.
  if (ordered.length !== tags.length)
    throw new BackupImportError("A hierarquia de tags do arquivo é inválida.");

  return ordered;
}

/**
 * Transforma o arquivo validado no payload de fio enviado numa única
 * chamada à Server Action (restaurar em lotes com chamadas separadas
 * quebrava a atomicidade -- cada chamada tinha sua própria transação, e um
 * lote no meio que falhasse deixava os anteriores já persistidos).
 */
export function toBackupPayload(file: BackupFile): {
  tags: BackupTagPayload[];
  items: BackupItemPayload[];
  skipped: number;
} {
  const tags = sortTagsByHierarchy(
    file.tags.map((tag) => ({
      key: tag.id,
      parentKey: tag.parentId,
      name: tag.name,
      colorToken: tag.colorToken,
      description: tag.description ?? null,
      createdAt: tag.createdAt ?? null,
    })),
  );

  const items: BackupItemPayload[] = [];
  let skipped = 0;

  for (const item of file.items) {
    if (item.type === "link") {
      const normalizedUrl = normalizeHttpUrl(item.url);
      if (!normalizedUrl) {
        skipped++;
        continue;
      }
      items.push({
        type: "link",
        title: item.title,
        url: item.url,
        content: null,
        description: item.description,
        createdAt: item.createdAt,
        tagKeys: item.tagIds,
      });
      continue;
    }
    if (item.type === "code_component") {
      if (item.url && !normalizeHttpUrl(item.url)) {
        skipped++;
        continue;
      }
      items.push({
        type: "code_component",
        title: item.title,
        url: item.url ?? null,
        content: item.content,
        description: item.description,
        createdAt: item.createdAt,
        tagKeys: item.tagIds,
      });
      continue;
    }
    items.push({
      type: "prompt",
      title: item.title,
      url: null,
      content: item.content,
      description: item.description,
      createdAt: item.createdAt,
      tagKeys: item.tagIds,
    });
  }

  return { tags, items, skipped };
}
