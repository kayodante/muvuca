"use client";

import { CopyIcon } from "lucide-react";

import { CODE_LANGUAGE_LABELS, type CodeLanguage } from "@/lib/code/languages";
import { copyToClipboard } from "@/lib/clipboard";
import { useDictionary } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { announce } from "@/components/states/Announcer";
import { toastError } from "@/components/states/Toast";

import { useHighlightedLines } from "./useHighlightedLines";
import { useTransientFlag } from "./useTransientFlag";
import { CopyStateIcon } from "./CopyStateIcon";

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
export function CodeSnippetEmbed({
  content,
  language,
}: {
  content: string;
  language: CodeLanguage | null;
}) {
  const t = useDictionary();
  const lines = useHighlightedLines(content, language);
  const [copied, triggerCopied] = useTransientFlag(1500);

  const lineCount = content.replace(/\n$/, "").split("\n").length;
  // Code points, não unidades UTF-16 — a mesma contagem do char_length do
  // Postgres na constraint de tamanho (ver PromptContentPanel).
  const charCount = [...content].length;

  // Mesmo fluxo de ItemCard.handleCopyCode: clipboard, feedback visual por
  // 1,5s e anúncio acessível com o texto padrão do app.
  async function handleCopy() {
    const success = await copyToClipboard(content);
    if (success) {
      triggerCopied();
      announce(t.items.codeSnippetEmbed.codeCopied);
    } else {
      toastError(t.items.codeSnippetEmbed.codeCopyFailed);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/60 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {/* Concat literal, não cn(): twMerge descartaria text-brand-pixel
              (fonte) por conflitar com text-type-code (cor). */}
          <span className="text-brand-pixel text-type-code">
            {t.items.card.types.code_component.label}
          </span>
          {language ? (
            <span className="text-metadata rounded-sm border border-border px-1.5 py-0.5 text-muted-foreground">
              {CODE_LANGUAGE_LABELS[language]}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-metadata text-muted-foreground">
            {t.items.codeSnippetEmbed.lineCount(lineCount)} ·{" "}
            {t.items.codeSnippetEmbed.charCount(charCount)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleCopy}
            aria-label={t.items.codeSnippetEmbed.copyCode}
          >
            <CopyStateIcon copied={copied} Icon={CopyIcon} />
          </Button>
        </div>
      </div>
      {/* Região focável: sem nada focável dentro, o Safari não alcança o
          scroll pelo teclado (Chrome 130+ e Firefox já tornam o scroller
          focável sozinhos). Anel inset porque o wrapper corta com
          overflow-hidden. */}
      <div
        role="region"
        aria-label={t.items.codeSnippetEmbed.codeRegion}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- área de scroll precisa de parada de Tab (comentário acima)
        tabIndex={0}
        className="max-h-[min(65dvh,44rem)] overflow-auto bg-secondary/30 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
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
