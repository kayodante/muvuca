"use client";

import { useTransition } from "react";
import Link from "next/link";
import { EllipsisVerticalIcon } from "lucide-react";

import { exportTagLibrary } from "@/lib/actions/export";
import { toastError, toastSuccess } from "@/components/states/Toast";
import { useDictionary } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function useTagExport(tagId: string, tagPath: string) {
  const t = useDictionary();
  const [pending, startTransition] = useTransition();

  const exportJson = () => {
    startTransition(async () => {
      try {
        const result = await exportTagLibrary(tagId);
        if (!result.ok) {
          toastError(result.message);
          return;
        }

        const blob = new Blob([JSON.stringify(result.data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `muvuca-tag-${tagPath.replaceAll("/", "-").slice(0, 100)}-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        toastSuccess(t.tags.exportSuccess);
      } catch {
        toastError(t.errors.exportFailed);
      }
    });
  };

  return { pending, exportJson };
}

export function TagDetailActions({
  tagId,
  tagPath,
  tagName,
}: {
  tagId: string;
  tagPath: string;
  tagName: string;
}) {
  const t = useDictionary();
  const { pending, exportJson } = useTagExport(tagId, tagPath);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-busy={pending} />}
      >
        <EllipsisVerticalIcon aria-hidden="true" className="size-4" />
        <span className="sr-only">{t.tags.inspector.moreActions(tagName)}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          render={
            <Link href={`/tags?${new URLSearchParams({ tag: tagPath })}`} />
          }
        >
          {t.tags.detail.editTag}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportJson} disabled={pending}>
          {pending ? t.export.exporting : t.tags.exportJson}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
