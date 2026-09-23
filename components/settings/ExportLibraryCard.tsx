"use client";

import { useTransition } from "react";
import { FileCodeIcon, FileTextIcon } from "lucide-react";
import { exportUserLibrary } from "@/lib/actions/export";
import { formatAsNetscapeBookmarks } from "@/lib/export/formatter";
import { useDictionary } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/components/states/Toast";

export function ExportLibraryCard() {
  const t = useDictionary();
  const [isPending, startTransition] = useTransition();

  function triggerDownload(
    content: string,
    filename: string,
    mimeType: string,
  ) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleExport(format: "json" | "html") {
    startTransition(async () => {
      const result = await exportUserLibrary();
      if (!result.ok) {
        toastError(result.message);
        return;
      }
      const today = new Date().toISOString().split("T")[0];
      if (format === "json") {
        const jsonString = JSON.stringify(result.data, null, 2);
        triggerDownload(
          jsonString,
          `muvuca-backup-${today}.json`,
          "application/json",
        );
        toastSuccess(t.export.jsonSuccess);
      } else {
        const htmlString = formatAsNetscapeBookmarks(result.data);
        triggerDownload(
          htmlString,
          `muvuca-bookmarks-${today}.html`,
          "text/html",
        );
        toastSuccess(t.export.htmlSuccess);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="space-y-1">
        <p className="text-label-md">{t.export.heading}</p>
        <p className="text-body-sm text-muted-foreground">
          {t.export.description}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          pending={isPending}
          pendingLabel={t.export.exporting}
          onClick={() => handleExport("json")}
        >
          <FileCodeIcon aria-hidden="true" data-icon="inline-start" />
          {t.export.jsonButton}
        </Button>
        <Button
          variant="outline"
          size="sm"
          pending={isPending}
          pendingLabel={t.export.exporting}
          onClick={() => handleExport("html")}
        >
          <FileTextIcon aria-hidden="true" data-icon="inline-start" />
          {t.export.htmlButton}
        </Button>
      </div>
    </div>
  );
}
