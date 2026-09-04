"use client";

import { useState } from "react";
import { FileJsonIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  importLibraryBackup,
  type BackupImportSummary,
} from "@/lib/actions/backup";
import { BackupImportError, toBackupPayload } from "@/lib/backup/batch";
import { MAX_BACKUP_FILE_SIZE } from "@/lib/backup/types";
import { backupFileSchema, type BackupFile } from "@/lib/backup/validation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Preview = { file: BackupFile; skipped: number };

export function ImportBackupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
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
      return setError("O arquivo excede o limite de 10 MB.");
    setError(null);
    setResult(null);

    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      return setError("Este arquivo não é um JSON válido.");
    }

    const parsed = backupFileSchema.safeParse(raw);
    if (!parsed.success)
      return setError(
        "Este arquivo não é um backup do Muvuca compatível com esta versão.",
      );

    try {
      const { skipped } = toBackupPayload(parsed.data);
      setPreview({ file: parsed.data, skipped });
    } catch (caught) {
      setError(
        caught instanceof BackupImportError
          ? caught.message
          : "Não foi possível ler este arquivo.",
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
      setError("Não foi possível concluir a restauração.");
      return;
    }

    setIsImporting(false);

    if (!response.ok) {
      setError(response.message);
      return;
    }

    setResult(response.data);
    toast.success("Backup restaurado.");
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Restaurar backup</DialogTitle>
          <DialogDescription>
            O arquivo é lido somente neste navegador. A restauração apenas
            acrescenta: nada é apagado nem sobrescrito.
          </DialogDescription>
        </DialogHeader>

        {!preview && !result && (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
            <FileJsonIcon
              aria-hidden="true"
              className="size-6 text-muted-foreground"
            />
            <span className="text-body-sm">
              Selecione um arquivo .json de até 10 MB
            </span>
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
              <Count label="Tags" value={preview.file.tags.length} />
              <Count label="Itens" value={preview.file.items.length} />
              <Count label="Ignorados" value={preview.skipped} />
            </div>

            {preview.file.tags.length === 0 &&
              preview.file.items.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Este arquivo de backup está vazio. Nenhuma alteração será
                  feita na biblioteca.
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
                Restaurando backup...
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="grid grid-cols-3 gap-2 text-sm">
            <Count label="Itens restaurados" value={result.itemsImported} />
            <Count label="Tags criadas" value={result.tagsCreated} />
            <Count label="Já existiam" value={result.duplicatesIgnored} />
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
                Escolher outro
              </Button>
              <Button onClick={confirm} pending={isImporting}>
                {isImporting ? "Restaurando..." : "Confirmar restauração"}
              </Button>
            </>
          )}
          {result && <Button onClick={() => close(false)}>Concluir</Button>}
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
