"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toastError, toastSuccess } from "@/components/states/Toast";
import { useTransientFlag } from "./useTransientFlag";

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
  label,
  pendingLabel,
  successLabel,
  successMessage,
  errorMessage,
  className,
}: {
  content: string;
  label: string;
  pendingLabel: string;
  successLabel: string;
  successMessage: string;
  errorMessage: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [copied, triggerCopied] = useTransientFlag(1500);

  async function copyContent() {
    setPending(true);
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(content);
      else if (!copyWithExecCommand(content)) throw new Error("copy failed");

      triggerCopied();

      toastSuccess(successMessage);
    } catch {
      toastError(errorMessage);
    } finally {
      setPending(false);
    }
  }

  return (
    // Copying is what a saved prompt or code component is for, so it carries the primary
    // weight in the detail dialog; editing is the secondary path.
    <Button
      type="button"
      size="sm"
      pending={pending}
      pendingIndicator="matrix"
      pendingLabel={pendingLabel}
      onClick={copyContent}
      className={cn(
        copied &&
          "border-brand-accent/40 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/15 dark:border-brand-accent/30 dark:bg-brand-accent/15",
        className,
      )}
    >
      <CopyStateIcon copied={copied} />
      <span className="tabular-nums">{copied ? successLabel : label}</span>
    </Button>
  );
}
