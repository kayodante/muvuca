"use client";

import { useState } from "react";
import { FileUpIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
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
import { indentClassFor } from "@/lib/tags/indent";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    const valid = validateBookmarkFile(file);
    if (!valid.ok) return setError(valid.message);
    setError(null);
    setResult(null);
    try {
      const parsed = parseBookmarkHtml(await file.text());
      if (parsed.items.length === 0)
        return setError("Nenhum favorito válido foi encontrado.");
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
          : "Não foi possível ler este arquivo.",
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
            ? `Erro ao importar lote ${i + 1} de ${totalBatches}: ${response.message}. Foram importados ${accumulated.itemsImported} links antes da falha.`
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
    toast.success("Favoritos importados.");
    if (accumulated.itemsImported > 0) notifyPreviewQueueChanged();
  }

  const duplicateSummary = preview
    ? summarizeBookmarkDuplicates(preview, existing)
    : null;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar favoritos</DialogTitle>
          <DialogDescription>
            O arquivo é lido somente neste navegador. Nenhuma URL será acessada.
          </DialogDescription>
        </DialogHeader>

        {!preview && !result && (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
            <FileUpIcon
              aria-hidden="true"
              className="size-6 text-muted-foreground"
            />
            <span className="text-body-sm">
              Selecione um arquivo .html de até 10 MB
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
              <Count label="Pastas" value={preview.tags.length} />
              <Count label="Links válidos" value={preview.items.length} />
              <Count
                label="Já na biblioteca"
                value={
                  isCheckingDuplicates
                    ? "..."
                    : existingChecked
                      ? (duplicateSummary?.alreadyInLibrary ?? 0)
                      : "—"
                }
              />
              <Count
                label="Repetidos no arquivo"
                value={duplicateSummary?.repeatedInFile ?? 0}
              />
              <Count label="Ignorados" value={preview.invalidCount} />
            </div>

            {isImporting && progress && (
              <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                <div className="text-body-sm flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium">
                    <Loader2Icon className="size-4 animate-spin text-primary [animation-duration:600ms] motion-reduce:[animation-duration:1200ms]" />
                    Importando lote {progress.currentBatch} de{" "}
                    {progress.totalBatches}...
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {progress.percent}%
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={progress.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Progresso da importação"
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
                  {progress.processedItems} de {progress.totalItems} favoritos
                  processados
                </p>
              </div>
            )}

            {!isImporting && (
              <div>
                <p className="text-label-md">Estrutura proposta</p>
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
                    {preview.flattenedFolderCount} pasta(s) foram achatadas no
                    sexto nível.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <Count label="Itens importados" value={result.itemsImported} />
              <Count label="Tags criadas" value={result.tagsCreated} />
              <Count
                label="Associações de tag"
                value={result.associationsCreated}
              />
              <Count
                label="Já estavam na biblioteca"
                value={
                  existingChecked
                    ? (duplicateSummary?.alreadyInLibrary ?? 0)
                    : "—"
                }
              />
              <Count
                label="Repetidos no arquivo"
                value={duplicateSummary?.repeatedInFile ?? 0}
              />
              <Count label="Erros ignorados" value={result.errorsIgnored} />
            </div>
            {/* Imports never fetch anything server-side during the import
              itself -- previews are enqueued the same way a manually-created
              link is, and drain in the background afterward. */}
            <p className="text-metadata text-muted-foreground">
              As prévias de link (miniatura, favicon, título e descrição
              remotos) carregam em segundo plano.
            </p>
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
                Escolher outro
              </Button>
              <Button
                onClick={confirm}
                disabled={isCheckingDuplicates}
                pending={isImporting}
              >
                {isImporting ? "Importando..." : "Confirmar importação"}
              </Button>
            </>
          )}
          {result && <Button onClick={() => close(false)}>Concluir</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Count({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-muted p-3">
      <p className="text-metadata text-muted-foreground">{label}</p>
      <p className="text-headline-sm mt-1">{value}</p>
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
