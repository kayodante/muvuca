"use client";

import { useState } from "react";
import { FileJsonIcon, Loader2Icon } from "lucide-react";

import {
  importLibraryBackup,
  type BackupImportSummary,
} from "@/lib/actions/backup";
import { BackupImportError, toBackupPayload } from "@/lib/backup/batch";
import { MAX_BACKUP_FILE_SIZE } from "@/lib/backup/types";
import { backupFileSchema, type BackupFile } from "@/lib/backup/validation";
import { useDictionary } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toastSuccess } from "@/components/states/Toast";

type Preview = { file: BackupFile; skipped: number };

export function ImportBackupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useDictionary();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BackupImportSummary | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  function reset() {
    setPreview(null);
    setError(null);
    setResult(null);
    setIsImporting(false);
  }

  function close(nextOpen: boolean) {
    if (isImporting) return;
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  async function selectFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BACKUP_FILE_SIZE)
      return setError(t.backup.fileTooLarge);
    setError(null);
    setResult(null);

    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      return setError(t.backup.invalidJson);
    }

    const parsed = backupFileSchema.safeParse(raw);
    if (!parsed.success) return setError(t.backup.incompatibleFile);

    try {
      const { skipped } = toBackupPayload(parsed.data);
      setPreview({ file: parsed.data, skipped });
    } catch (caught) {
      setError(
        caught instanceof BackupImportError
          ? t.errors.backupHierarchyInvalid
          : t.errors.unreadableFile,
      );
    }
  }

  async function confirm() {
    if (!preview || isImporting) return;
    setError(null);
    setIsImporting(true);

    // Restauração inteira numa única chamada: a RPC processa tudo dentro de
    // uma única transação de Postgres, ou tudo é persistido, ou nada é.
    // Não há progresso incremental real para reportar entre o início e o
    // fim desta chamada.
    const { tags, items } = toBackupPayload(preview.file);

    let response: Awaited<ReturnType<typeof importLibraryBackup>>;
    try {
      response = await importLibraryBackup({ tags, items });
    } catch {
      setIsImporting(false);
      setError(t.errors.backupRestoreFailed);
      return;
    }

    setIsImporting(false);

    if (!response.ok) {
      setError(response.message);
      return;
    }

    setResult(response.data);
    toastSuccess(t.backup.restored);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t.backup.dialogTitle}</DialogTitle>
          <DialogDescription>{t.backup.dialogDescription}</DialogDescription>
        </DialogHeader>

        {!preview && !result && (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
            <FileJsonIcon
              aria-hidden="true"
              className="size-6 text-muted-foreground"
            />
            <span className="text-body-sm">{t.backup.selectFile}</span>
            <input
              className="sr-only"
              type="file"
              accept=".json,application/json"
              onChange={(event) => void selectFile(event.target.files?.[0])}
            />
          </label>
        )}

        {preview && !result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <Count
                label={t.backup.counts.tags}
                value={preview.file.tags.length}
              />
              <Count
                label={t.backup.counts.items}
                value={preview.file.items.length}
              />
              <Count label={t.backup.counts.ignored} value={preview.skipped} />
            </div>

            {preview.file.tags.length === 0 &&
              preview.file.items.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t.backup.emptyFile}
                </p>
              )}

            {isImporting && (
              <div
                role="status"
                className="text-body-sm flex items-center gap-2 rounded-lg border bg-muted/30 p-4 font-medium"
              >
                <Loader2Icon
                  aria-hidden="true"
                  className="size-4 animate-spin text-primary [animation-duration:600ms] motion-reduce:[animation-duration:1200ms]"
                />
                {t.backup.restoring}
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="grid grid-cols-3 gap-2 text-sm">
            <Count
              label={t.backup.resultCounts.itemsRestored}
              value={result.itemsImported}
            />
            <Count
              label={t.backup.resultCounts.tagsCreated}
              value={result.tagsCreated}
            />
            <Count
              label={t.backup.resultCounts.alreadyExisted}
              value={result.duplicatesIgnored}
            />
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
              <Button variant="ghost" onClick={reset} disabled={isImporting}>
                {t.backup.chooseAnother}
              </Button>
              <Button
                onClick={confirm}
                pending={isImporting}
                pendingLabel={t.backup.restoringShort}
              >
                {isImporting
                  ? t.backup.restoringShort
                  : t.backup.confirmRestore}
              </Button>
            </>
          )}
          {result && (
            <Button onClick={() => close(false)}>{t.backup.done}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Duplicado de ImportBookmarksDialog de propósito: 7 linhas não justificam
// refatorar um componente já testado.
function Count({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-muted p-3">
      <p className="text-metadata text-muted-foreground">{label}</p>
      <p className="text-headline-sm mt-1">{value}</p>
    </div>
  );
}
