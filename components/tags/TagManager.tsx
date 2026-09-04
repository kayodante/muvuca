"use client";

import { useState, type ReactNode } from "react";

import { filterTagTree, type FlatTag, type TagNode } from "@/lib/tags/tree";
import { TagTree, type TagTreeActions } from "./TagTree";
import { TagEditor, type TagEditorTarget } from "./TagEditor";
import { DeleteTagAlertDialog } from "./DeleteTagAlertDialog";

type DeleteTarget = { id: string; name: string };

/**
 * Owns the create/edit/delete dialog state shared by every tag surface
 * (root tree in `/tags`, a single tag's children in `/tags/[tagId]`).
 * Exposes it via a render-prop so each page keeps its own header/layout
 * while sharing one implementation of "open the editor for this tag" --
 * both the tree's own row menu and a page's "editar esta tag" button need
 * the exact same dialogs, just triggered from different places.
 */
export function TagManager({
  flatTags,
  treeNodes,
  activeTagId,
  children,
}: {
  flatTags: FlatTag[];
  treeNodes: TagNode[];
  activeTagId?: string;
  children: (ctx: {
    tree: ReactNode;
    hasVisibleNodes: boolean;
    searchValue: string;
    onSearchChange: (value: string) => void;
    openCreate: (parentId: string | null) => void;
    openEdit: (tag: FlatTag) => void;
    openDelete: (tag: DeleteTarget) => void;
  }) => ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTarget, setEditorTarget] = useState<TagEditorTarget | null>(
    null,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const openCreate = (parentId: string | null) => {
    setEditorTarget({ mode: "create", parentId });
    setEditorOpen(true);
  };

  const openEdit = (tag: FlatTag) => {
    setEditorTarget({ mode: "edit", tag });
    setEditorOpen(true);
  };

  const openDelete = (tag: DeleteTarget) => {
    setDeleteTarget(tag);
    setDeleteOpen(true);
  };

  const treeActions: TagTreeActions = {
    onCreateChild: (tag) => openCreate(tag.id),
    onEdit: (tag) => openEdit(tag),
    onDelete: (tag) => openDelete(tag),
  };

  const visibleNodes = filterTagTree(treeNodes, search);
  const tree = (
    <TagTree
      nodes={visibleNodes}
      activeTagId={activeTagId}
      actions={treeActions}
    />
  );

  return (
    <>
      {children({
        tree,
        hasVisibleNodes: visibleNodes.length > 0,
        searchValue: search,
        onSearchChange: setSearch,
        openCreate,
        openEdit,
        openDelete,
      })}

      <TagEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        target={editorTarget}
        flatTags={flatTags}
      />

      <DeleteTagAlertDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        tag={deleteTarget}
      />
    </>
  );
}
