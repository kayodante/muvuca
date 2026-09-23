"use client";

import { PlusIcon, TagIcon } from "lucide-react";

import { buildTagTree, type FlatTag } from "@/lib/tags/tree";
import { useDictionary } from "@/lib/i18n/client";
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
  const t = useDictionary();
  const treeNodes = buildTagTree(flatTags);

  return (
    <TagManager flatTags={flatTags} treeNodes={treeNodes}>
      {({ tree, hasVisibleNodes, searchValue, onSearchChange, openCreate }) => (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-headline-md">{t.tags.page.heading}</h1>
            <Button onClick={() => openCreate(null)}>
              <PlusIcon aria-hidden="true" data-icon="inline-start" />
              {t.tags.page.createTag}
            </Button>
          </div>

          {flatTags.length === 0 ? (
            <EmptyState
              icon={TagIcon}
              title={t.tags.page.emptyTitle}
              description={t.tags.page.emptyDescription}
              action={
                <Button onClick={() => openCreate(null)}>
                  <PlusIcon aria-hidden="true" data-icon="inline-start" />
                  {t.tags.page.createTag}
                </Button>
              }
            />
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tag-search" className="sr-only">
                  {t.tags.page.filterLabel}
                </label>
                <Input
                  id="tag-search"
                  type="search"
                  dir="auto"
                  maxLength={80}
                  placeholder={t.tags.page.filterLabel}
                  value={searchValue}
                  onChange={(event) => onSearchChange(event.target.value)}
                  className="max-w-xs"
                />
              </div>
              {hasVisibleNodes ? (
                <div role="region" aria-label={t.tags.page.treeRegionLabel}>
                  {tree}
                </div>
              ) : (
                <div className="flex flex-col items-start gap-2 py-4">
                  <p
                    dir="auto"
                    className="text-body-sm [overflow-wrap:anywhere] text-muted-foreground"
                  >
                    {t.tags.page.noneFound(searchValue)}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSearchChange("")}
                  >
                    {t.tags.page.clearSearch}
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
