"use client";

import { PlusIcon, TagIcon } from "lucide-react";

import { buildTagTree, type FlatTag } from "@/lib/tags/tree";
import { TagManager } from "./TagManager";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/states/EmptyState";

/**
 * `/tags` root: the whole tag tree plus create/edit/delete, all owned by
 * `TagManager`. A Client Component because its render-prop needs to run on
 * the client; `flatTags` arrives as plain, already-fetched data from the
 * Server Component page.
 */
export function TagsPage({ flatTags }: { flatTags: FlatTag[] }) {
  const treeNodes = buildTagTree(flatTags);

  return (
    <TagManager flatTags={flatTags} treeNodes={treeNodes}>
      {({ tree, hasVisibleNodes, searchValue, onSearchChange, openCreate }) => (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-headline-md">Tags</h1>
            <Button onClick={() => openCreate(null)}>
              <PlusIcon aria-hidden="true" data-icon="inline-start" />
              Criar tag
            </Button>
          </div>

          {flatTags.length === 0 ? (
            <EmptyState
              icon={TagIcon}
              title="Nenhuma tag ainda"
              description="Crie tags para organizar sua biblioteca em hierarquias, como Skills → Design → Dev."
              action={
                <Button onClick={() => openCreate(null)}>
                  <PlusIcon aria-hidden="true" data-icon="inline-start" />
                  Criar tag
                </Button>
              }
            />
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tag-search" className="sr-only">
                  Filtrar tags por nome
                </label>
                <Input
                  id="tag-search"
                  type="search"
                  dir="auto"
                  maxLength={80}
                  placeholder="Filtrar tags por nome"
                  value={searchValue}
                  onChange={(event) => onSearchChange(event.target.value)}
                  className="max-w-xs"
                />
              </div>
              {hasVisibleNodes ? (
                <div role="region" aria-label="Árvore de tags">
                  {tree}
                </div>
              ) : (
                <div className="flex flex-col items-start gap-2 py-4">
                  <p
                    dir="auto"
                    className="text-body-sm [overflow-wrap:anywhere] text-muted-foreground"
                  >
                    Nenhuma tag encontrada para “{searchValue}”.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSearchChange("")}
                  >
                    Limpar busca
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </TagManager>
  );
}
