"use client";

import { useState } from "react";
import { CheckIcon, FileUpIcon } from "lucide-react";
import {
  findExistingBookmarkUrls,
  importBrowserBookmarks,
  type BookmarkImportSummary,
} from "@/lib/actions/bookmarks";
import { createBookmarkBatches } from "@/lib/bookmarks/batch";
import { notifyPreviewQueueChanged } from "@/lib/events/preview-queue";
import { summarizeBookmarkDuplicates } from "@/lib/bookmarks/summary";
import {
  BookmarkImportError,
  parseBookmarkHtml,
  validateBookmarkFile,
} from "@/lib/bookmarks/parser";
import {
  BOOKMARK_BATCH_SIZE,
  type BookmarkParseResult,
} from "@/lib/bookmarks/types";
import { useDictionary, useLocale } from "@/lib/i18n/client";
import { indentClassFor } from "@/lib/tags/indent";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MatrixLoader } from "@/components/ui/matrix-loader";
import { NumberPopIn } from "@/components/ui/number-pop-in";
import { ShimmerText } from "@/components/ui/shimmer-text";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toastSuccess } from "@/components/states/Toast";

type ProgressState = {
  currentBatch: number;
  totalBatches: number;
  processedItems: number;
  totalItems: number;
  percent: number;
};

export function ImportBookmarksDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useDictionary();
  const locale = useLocale();
  const [preview, setPreview] = useState<BookmarkParseResult | null>(null);
  const [existing, setExisting] = useState<string[]>([]);
  const [existingChecked, setExistingChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookmarkImportSummary | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);

  function reset() {
    setPreview(null);
    setExisting([]);
    setExistingChecked(false);
    setError(null);
    setResult(null);
    setIsImporting(false);
    setIsCheckingDuplicates(false);
    setProgress(null);
  }

  function close(nextOpen: boolean) {
    if (isImporting) return;
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  async function selectFile(file: File | undefined) {
    if (!file) return;
    const valid = validateBookmarkFile(file, t);
    if (!valid.ok) return setError(valid.message);
    setError(null);
    setResult(null);
    try {
      const parsed = parseBookmarkHtml(await file.text(), t, locale);
      if (parsed.items.length === 0)
        return setError(t.bookmarks.errors.noValidBookmarks);
      setPreview(parsed);
      setExistingChecked(false);
      setIsCheckingDuplicates(true);
      const found = await findExistingBookmarkUrls([
        ...new Set(parsed.items.map((item) => item.normalizedUrl)),
      ]);
      setIsCheckingDuplicates(false);
      if (found.ok) {
        setExisting(found.data);
        setExistingChecked(true);
      } else {
        setError(found.message);
      }
    } catch (caught) {
      setIsCheckingDuplicates(false);
      setError(
        caught instanceof BookmarkImportError
          ? caught.message
          : t.errors.unreadableFile,
      );
    }
  }

  async function confirm() {
    if (!preview || isImporting) return;
    setError(null);
    setIsImporting(true);

    const batches = createBookmarkBatches(preview, BOOKMARK_BATCH_SIZE);
    const totalItems = preview.items.length;
    const totalBatches = batches.length;

    const accumulated: BookmarkImportSummary = {
      itemsImported: 0,
      tagsCreated: 0,
      associationsCreated: 0,
      errorsIgnored: preview.invalidCount,
    };

    let processedItems = 0;

    for (let i = 0; i < totalBatches; i++) {
      const batch = batches[i]!;
      setProgress({
        currentBatch: i + 1,
        totalBatches,
        processedItems,
        totalItems,
        percent: Math.round((processedItems / totalItems) * 100),
      });

      const response = await importBrowserBookmarks(batch);

      if (!response.ok) {
        setIsImporting(false);
        setError(
          accumulated.itemsImported > 0
            ? t.bookmarks.dialog.batchError(
                i + 1,
                totalBatches,
                response.message,
                accumulated.itemsImported,
              )
            : response.message,
        );
        return;
      }

      accumulated.itemsImported += response.data.itemsImported;
      accumulated.tagsCreated += response.data.tagsCreated;
      accumulated.associationsCreated += response.data.associationsCreated;
      processedItems += batch.items.length;

      setProgress({
        currentBatch: i + 1,
        totalBatches,
        processedItems,
        totalItems,
        percent: Math.min(100, Math.round((processedItems / totalItems) * 100)),
      });
    }

    setIsImporting(false);
    setProgress(null);
    setResult(accumulated);
    toastSuccess(t.bookmarks.dialog.imported);
    if (accumulated.itemsImported > 0) notifyPreviewQueueChanged();
  }

  const duplicateSummary = preview
    ? summarizeBookmarkDuplicates(preview, existing)
    : null;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t.bookmarks.dialog.title}</DialogTitle>
          <DialogDescription>
            {t.bookmarks.dialog.description}
          </DialogDescription>
        </DialogHeader>

        {!preview && !result && (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
            <FileUpIcon
              aria-hidden="true"
              className="size-6 text-muted-foreground"
            />
            <span className="text-body-sm">
              {t.bookmarks.dialog.selectFile}
            </span>
            <input
              className="sr-only"
              type="file"
              accept=".html,.htm,text/html"
              onChange={(event) => void selectFile(event.target.files?.[0])}
            />
          </label>
        )}

        {preview && !result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <Count
                label={t.bookmarks.dialog.counts.folders}
                value={preview.tags.length}
              />
              <Count
                label={t.bookmarks.dialog.counts.validLinks}
                value={preview.items.length}
              />
              <Count
                label={t.bookmarks.dialog.counts.alreadyInLibrary}
                value={
                  isCheckingDuplicates ? (
                    <ShimmerText text="..." />
                  ) : existingChecked ? (
                    (duplicateSummary?.alreadyInLibrary ?? 0)
                  ) : (
                    "—"
                  )
                }
              />
              <Count
                label={t.bookmarks.dialog.counts.duplicatesInFile}
                value={duplicateSummary?.repeatedInFile ?? 0}
              />
              <Count
                label={t.bookmarks.dialog.counts.ignored}
                value={preview.invalidCount}
              />
            </div>

            {isImporting && progress && (
              <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                <div className="text-body-sm flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium">
                    <MatrixLoader
                      variant="orbit"
                      rounded
                      className="size-4 text-primary"
                      aria-label={t.bookmarks.dialog.importingAria}
                    />
                    <ShimmerText
                      text={t.bookmarks.dialog.importingBatch(
                        progress.currentBatch,
                        progress.totalBatches,
                      )}
                    />
                  </span>
                  <span className="font-mono text-muted-foreground">
                    <NumberPopIn value={`${progress.percent}%`} />
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={progress.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t.bookmarks.dialog.progressAria}
                  className="h-2.5 w-full overflow-hidden rounded-full bg-secondary"
                >
                  <div
                    // scaleX (GPU) em vez de width (layout+paint) a cada lote importado;
                    // seguro porque o pai já corta o raio com overflow-hidden.
                    className="h-full w-full origin-left bg-primary transition-transform duration-(--motion-base) ease-out-muvuca motion-reduce:transition-none"
                    style={{ transform: `scaleX(${progress.percent / 100})` }}
                  />
                </div>
                <p className="text-metadata text-muted-foreground">
                  {t.bookmarks.dialog.processedOf(
                    progress.processedItems,
                    progress.totalItems,
                  )}
                </p>
              </div>
            )}

            {!isImporting && (
              <div>
                <p className="text-label-md">
                  {t.bookmarks.dialog.proposedStructure}
                </p>
                <ul className="text-body-sm mt-2 max-h-48 space-y-1 overflow-y-auto pr-1 text-muted-foreground">
                  {preview.tags.map((tag) => (
                    <li
                      key={tag.key}
                      dir="auto"
                      className={`truncate ${indentClassFor(depth(tag.key, preview.tags))}`}
                    >
                      {tag.name}
                    </li>
                  ))}
                </ul>
                {preview.flattenedFolderCount > 0 && (
                  <p className="text-body-sm mt-2 text-muted-foreground">
                    {t.bookmarks.dialog.flattenedFolders(
                      preview.flattenedFolderCount,
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-primary/25 bg-primary/[0.04] p-3.5 dark:border-primary/20 dark:bg-primary/[0.06]">
              <div className="space-y-0.5">
                <span className="text-brand-pixel text-brand-accent uppercase">
                  {t.bookmarks.dialog.catalogedBadge}
                </span>
                <p className="text-body-sm font-medium text-foreground">
                  {result.itemsImported === 0
                    ? t.bookmarks.dialog.resultNone
                    : result.itemsImported === 1
                      ? t.bookmarks.dialog.resultOne
                      : t.bookmarks.dialog.resultMany(
                          result.itemsImported,
                          locale,
                        )}
                </p>
              </div>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-brand-accent">
                <CheckIcon aria-hidden="true" className="size-4" />
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <Count
                label={t.bookmarks.dialog.resultCounts.itemsImported}
                value={<NumberPopIn value={result.itemsImported} />}
                highlight={result.itemsImported > 0}
              />
              <Count
                label={t.bookmarks.dialog.resultCounts.tagsCreated}
                value={<NumberPopIn value={result.tagsCreated} />}
                highlight={result.tagsCreated > 0}
              />
              <Count
                label={t.bookmarks.dialog.resultCounts.associationsCreated}
                value={<NumberPopIn value={result.associationsCreated} />}
                highlight={result.associationsCreated > 0}
              />
              <Count
                label={t.bookmarks.dialog.resultCounts.alreadyInLibrary}
                value={
                  existingChecked
                    ? (duplicateSummary?.alreadyInLibrary ?? 0)
                    : "—"
                }
              />
              <Count
                label={t.bookmarks.dialog.resultCounts.duplicatesInFile}
                value={duplicateSummary?.repeatedInFile ?? 0}
              />
              <Count
                label={t.bookmarks.dialog.resultCounts.errorsIgnored}
                value={result.errorsIgnored}
              />
            </div>

            {/* Imports never fetch anything server-side during the import
              itself -- previews are enqueued the same way a manually-created
              link is, and drain in the background afterward. */}
            <div className="text-metadata flex items-center gap-2.5 rounded-md border border-border/40 bg-muted/30 px-3 py-2 text-muted-foreground">
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60 opacity-75 motion-reduce:hidden" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              <span>{t.bookmarks.dialog.previewsNote}</span>
            </div>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="text-sm [overflow-wrap:anywhere] break-words text-destructive"
          >
            {error}
          </p>
        )}

        <DialogFooter>
          {preview && !result && (
            <>
              <Button
                variant="ghost"
                onClick={reset}
                disabled={isImporting || isCheckingDuplicates}
              >
                {t.bookmarks.dialog.chooseAnother}
              </Button>
              <Button
                onClick={confirm}
                disabled={isCheckingDuplicates}
                pending={isImporting}
                pendingLabel={t.bookmarks.dialog.importing}
              >
                {isImporting
                  ? t.bookmarks.dialog.importing
                  : t.bookmarks.dialog.confirmImport}
              </Button>
            </>
          )}
          {result && (
            <Button
              onClick={() => close(false)}
              className="transition-transform duration-(--motion-fast) ease-out-muvuca active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              {t.bookmarks.dialog.done}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Count({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number | string | React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-3 transition-[border-color,background-color] duration-(--motion-base) ease-out-muvuca",
        highlight
          ? "border-primary/25 bg-primary/[0.04] dark:border-primary/20 dark:bg-primary/[0.06]"
          : "border-transparent bg-muted",
      )}
    >
      <p className="text-metadata text-muted-foreground">{label}</p>
      <div
        className={cn(
          "text-headline-sm mt-1 tabular-nums",
          highlight && "font-semibold text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function depth(key: string, tags: BookmarkParseResult["tags"]): number {
  let tag = tags.find((entry) => entry.key === key);
  let value = 0;
  while (tag?.parentKey) {
    value++;
    tag = tags.find((entry) => entry.key === tag?.parentKey);
  }
  return value;
}
