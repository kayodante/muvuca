"use client";

import { useState } from "react";
import { UploadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ImportBackupDialog } from "./ImportBackupDialog";

export function ImportBackupCard() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="space-y-1">
        <p className="text-label-md">Restaurar backup</p>
        <p className="text-body-sm text-muted-foreground">
          Carregue um arquivo JSON exportado do Muvuca para reconstruir links,
          prompts e tags. Nada do que já existe é apagado.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <UploadIcon aria-hidden="true" data-icon="inline-start" />
          Restaurar backup JSON
        </Button>
      </div>

      <ImportBackupDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
