"use client";

import { useState } from "react";
import { CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

function copyWithExecCommand(content: string) {
  const textarea = document.createElement("textarea");
  textarea.value = content;
  textarea.readOnly = true;
  textarea.style.cssText = "position:fixed;opacity:0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

export function PromptCopyButton({
  content,
  label = "Copiar conteúdo",
  pendingLabel,
  successMessage = "Conteúdo copiado.",
  errorMessage = "Não foi possível copiar o conteúdo.",
}: {
  content: string;
  label?: string;
  pendingLabel?: string;
  successMessage?: string;
  errorMessage?: string;
}) {
  const [pending, setPending] = useState(false);

  async function copyContent() {
    setPending(true);
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(content);
      else if (!copyWithExecCommand(content)) throw new Error("copy failed");
      toast.success(successMessage);
    } catch {
      toast.error(errorMessage);
    } finally {
      setPending(false);
    }
  }

  const resolvedPendingLabel =
    pendingLabel ??
    (label.startsWith("Copiar")
      ? label.replace(/^Copiar/, "Copiando")
      : "Copiando conteúdo");

  return (
    // Copying is what a saved prompt or code component is for, so it carries the primary
    // weight in the detail dialog; editing is the secondary path.
    <Button
      type="button"
      size="sm"
      pending={pending}
      pendingLabel={resolvedPendingLabel}
      onClick={copyContent}
    >
      <CopyIcon aria-hidden="true" data-icon="inline-start" />
      {label}
    </Button>
  );
}
