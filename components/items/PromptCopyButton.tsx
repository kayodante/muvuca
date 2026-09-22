"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toastError, toastSuccess } from "@/components/states/Toast";

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

/**
 * Crossfade entre o ícone de copiar e o check de confirmação,
 * mantendo ambos empilhados para não alterar dimensões no layout.
 */
function CopyStateIcon({
  copied,
  Icon = CopyIcon,
}: {
  copied: boolean;
  Icon?: typeof CopyIcon;
}) {
  return (
    <span
      className="t-icon-swap size-4 shrink-0"
      data-state={copied ? "b" : "a"}
      data-icon="inline-start"
    >
      <Icon aria-hidden="true" data-icon="a" className="t-icon size-4" />
      <CheckIcon
        aria-hidden="true"
        data-icon="b"
        className="t-icon size-4 text-brand-accent"
      />
    </span>
  );
}

export function PromptCopyButton({
  content,
  label = "Copiar conteúdo",
  pendingLabel,
  successLabel,
  successMessage = "Conteúdo copiado.",
  errorMessage = "Não foi possível copiar o conteúdo.",
  className,
}: {
  content: string;
  label?: string;
  pendingLabel?: string;
  successLabel?: string;
  successMessage?: string;
  errorMessage?: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function copyContent() {
    setPending(true);
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(content);
      else if (!copyWithExecCommand(content)) throw new Error("copy failed");

      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 1800);

      toastSuccess(successMessage);
    } catch {
      toastError(errorMessage);
    } finally {
      setPending(false);
    }
  }

  const resolvedPendingLabel =
    pendingLabel ??
    (label.startsWith("Copiar")
      ? label.replace(/^Copiar/, "Copiando")
      : "Copiando conteúdo");

  const resolvedSuccessLabel =
    successLabel ??
    (label.toLowerCase().includes("código")
      ? "Código copiado!"
      : label.toLowerCase().includes("prompt")
        ? "Prompt copiado!"
        : "Copiado!");

  return (
    // Copying is what a saved prompt or code component is for, so it carries the primary
    // weight in the detail dialog; editing is the secondary path.
    <Button
      type="button"
      size="sm"
      pending={pending}
      pendingIndicator="matrix"
      pendingLabel={resolvedPendingLabel}
      onClick={copyContent}
      className={cn(
        "relative transition-[border-color,background-color,color,transform] duration-(--motion-fast) ease-out-muvuca active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100",
        copied &&
          "border-brand-accent/40 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/15 dark:border-brand-accent/30 dark:bg-brand-accent/15",
        className,
      )}
    >
      <CopyStateIcon copied={copied} />
      <span className="tabular-nums">
        {copied ? resolvedSuccessLabel : label}
      </span>
    </Button>
  );
}
