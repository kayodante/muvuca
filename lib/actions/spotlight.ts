"use server";

import { requireUser } from "@/lib/auth/require-user";
import {
  getLibraryItems,
  type LibraryItemSummary,
} from "@/lib/database/queries/items";
import { getTagList, type Tag } from "@/lib/database/queries/tags";
import { fail, ok, type ActionResult } from "@/lib/utils/result";

export type SpotlightData = {
  items: LibraryItemSummary[];
  tags: Tag[];
};

/**
 * Carrega o lote inicial de itens mais recentes e tags para exibição imediata
 * ao abrir o Muvuca Spotlight antes do usuário começar a digitar.
 */
export async function getSpotlightInitialData(): Promise<
  ActionResult<SpotlightData>
> {
  try {
    await requireUser();
    const [libraryPage, tags] = await Promise.all([
      getLibraryItems({ sort: "newest" }),
      getTagList(),
    ]);

    return ok({
      items: libraryPage.items,
      tags,
    });
  } catch {
    return fail(
      "UNKNOWN",
      "Não foi possível carregar os dados para a busca rápida.",
    );
  }
}

/**
 * Busca itens da biblioteca pelo RPC indexado search_library com suporte a
 * pesquisa textual, filtro por tag e ordenação recente.
 */
export async function searchSpotlightItems(
  query: string,
  tagId?: string | null,
): Promise<ActionResult<SpotlightData>> {
  try {
    await requireUser();
    const normalizedQuery = query.trim();
    const [libraryPage, tags] = await Promise.all([
      getLibraryItems({
        q: normalizedQuery || undefined,
        tag: tagId || undefined,
        sort: "newest",
      }),
      getTagList(),
    ]);

    return ok({
      items: libraryPage.items,
      tags,
    });
  } catch {
    return fail("UNKNOWN", "Erro ao pesquisar itens na busca rápida.");
  }
}
