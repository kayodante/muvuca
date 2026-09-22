"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

import { CODE_LANGUAGE_LABELS, type CodeLanguage } from "@/lib/code/languages";
import { copyToClipboard } from "@/lib/clipboard";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/components/states/Toast";

import { useHighlightedLines } from "./useHighlightedLines";

/**
 * Bloco de código completo do dialog de detalhe: header com a identidade do
 * tipo (pixel "code" + linguagem), contadores e ação de copiar; corpo com
 * régua de números e os tokens coloridos pelo Shiki.
 *
 * O highlight é async e decorativo: o primeiro paint já mostra o código em
 * plaintext (sem flash vazio) e o efeito troca pelas linhas coloridas quando
 * resolve. Se o highlight falhar, nada acontece — as linhas plaintext já
 * estão na tela (o silêncio é o estado de erro, por desenho da lib).
 *
 * A régua é uma coluna irmã da coluna de código (não um agregado por linha),
 * então os números jamais entram na seleção/cópia do conteúdo. As duas
 * colunas dividem o mesmo line-height (`leading-6` vence o 1.35 de
 * `text-metadata` pela ordem de layers do Tailwind) — régua e código ficam
 * em fase a qualquer número de linhas.
 */
function pluralize(count: number, singular: string, plural: string) {
  return `${count.toLocaleString("pt-BR")} ${count === 1 ? singular : plural}`;
}

/**
 * Crossfade do ícone de copiar para o check de confirmação, com o par
 * empilhado na mesma célula para o botão não mudar de largura. Mesma técnica
 * do `CopyStateIcon` de ItemCard — duplicado aqui de propósito: aquele é
 * privado do card e este arquivo não pode depender dele sem acoplar os dois.
 */
function CopyStateIcon({
  copied,
  Icon,
}: {
  copied: boolean;
  Icon: typeof CopyIcon;
}) {
  return (
    <span className="t-icon-swap size-4" data-state={copied ? "b" : "a"}>
      <Icon aria-hidden="true" data-icon="a" className="t-icon size-4" />
      <CheckIcon
        aria-hidden="true"
        data-icon="b"
        className="t-icon size-4 text-brand-accent"
      />
    </span>
  );
}

export function CodeSnippetEmbed({
  content,
  language,
}: {
  content: string;
  language: CodeLanguage | null;
}) {
  const lines = useHighlightedLines(content, language);
  const [copied, setCopied] = useState(false);

  const lineCount = content.replace(/\n$/, "").split("\n").length;
  // Code points, não unidades UTF-16 — a mesma contagem do char_length do
  // Postgres na constraint de tamanho (ver PromptContentPanel).
  const charCount = [...content].length;

  // Mesmo fluxo de ItemCard.handleCopyCode: clipboard, feedback visual por
  // 1,5s e toast com o texto padrão do app.
  async function handleCopy() {
    const success = await copyToClipboard(content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toastSuccess("Código copiado para a área de transferência.");
    } else {
      toastError("Não foi possível copiar o código.");
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/60 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {/* Concat literal, não cn(): twMerge descartaria text-brand-pixel
              (fonte) por conflitar com text-type-code (cor). */}
          <span className="text-brand-pixel text-type-code">code</span>
          {language ? (
            <span className="text-metadata rounded-sm border border-border px-1.5 py-0.5 text-muted-foreground">
              {CODE_LANGUAGE_LABELS[language]}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-metadata text-muted-foreground">
            {pluralize(lineCount, "linha", "linhas")} ·{" "}
            {pluralize(charCount, "caractere", "caracteres")}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleCopy}
            aria-label="Copiar código"
          >
            <CopyStateIcon copied={copied} Icon={CopyIcon} />
          </Button>
        </div>
      </div>
      <div className="max-h-[min(65dvh,44rem)] overflow-auto bg-secondary/30">
        <div
          className="text-body-sm flex gap-4 px-4 py-3 font-mono leading-6"
          style={{ color: "var(--code-foreground)" }}
        >
          <div
            aria-hidden="true"
            className="text-metadata min-w-8 text-right leading-6 text-muted-foreground select-none"
          >
            {lines.map((_, index) => (
              <div key={index}>{index + 1}</div>
            ))}
          </div>
          <div className="flex-1">
            {lines.map((line, index) => (
              // min-h-6 mantém a linha vazia com a mesma altura das demais,
              // senão ela colapsaria e a régua sairia de fase com o código.
              <div key={index} className="min-h-6 whitespace-pre">
                {line.map((token, tokenIndex) =>
                  token.color ? (
                    <span key={tokenIndex} style={{ color: token.color }}>
                      {token.content}
                    </span>
                  ) : (
                    <span key={tokenIndex}>{token.content}</span>
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
