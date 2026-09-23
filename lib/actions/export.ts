"use server";

import { requireUser } from "@/lib/auth/require-user";
import { getDictionary } from "@/lib/i18n/server";
import { logEvent } from "@/lib/security/logging";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/utils/result";
import { BACKUP_FORMAT_VERSION, type ExportData } from "@/lib/export/formatter";

export async function exportUserLibrary(): Promise<ActionResult<ExportData>> {
  const t = await getDictionary();
  const user = await requireUser();
  const supabase = await createClient();

  const [tagsResult, itemsResult, itemTagsResult] = await Promise.all([
    supabase
      .from("tags")
      .select("id, name, slug, color_token, parent_id, description, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("library_items")
      .select(
        "id, type, title, url, description, content, language, created_at",
      )
      .order("created_at", { ascending: false }),
    supabase.from("item_tags").select("item_id, tag_id"),
  ]);

  if (tagsResult.error || itemsResult.error || itemTagsResult.error) {
    logEvent({
      event: "export.failed",
      status: "failure",
      errorClass:
        tagsResult.error?.code ??
        itemsResult.error?.code ??
        itemTagsResult.error?.code,
      userId: user.id,
    });
    return fail("UNKNOWN", t.errors.exportFailed);
  }

  const tagMap = new Map<string, string[]>();
  for (const row of itemTagsResult.data ?? []) {
    const list = tagMap.get(row.item_id) ?? [];
    list.push(row.tag_id);
    tagMap.set(row.item_id, list);
  }

  const exportData: ExportData = {
    version: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    tags: (tagsResult.data ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      colorToken: t.color_token,
      parentId: t.parent_id,
      description: t.description,
      createdAt: t.created_at,
      slug: t.slug,
    })),
    items: (itemsResult.data ?? []).map((item) => ({
      id: item.id,
      type: item.type as "link" | "prompt" | "code_component",
      title: item.title,
      url: item.url,
      description: item.description,
      content: item.content,
      // Formato 1.2: language só existe como chave em code_component --
      // link/prompt não a carregam nem como null.
      ...(item.type === "code_component"
        ? { language: item.language ?? null }
        : {}),
      tagIds: tagMap.get(item.id) ?? [],
      createdAt: item.created_at,
    })),
  };

  return ok(exportData);
}
