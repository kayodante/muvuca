"use client";

import { cn } from "@/lib/utils";
import { CODE_LANGUAGE_LABELS, type CodeLanguage } from "@/lib/code/languages";

import { useHighlightedLines } from "./useHighlightedLines";

/**
 * Preview do card de `code_component`: as primeiras linhas do snippet com os
 * mesmos tokens coloridos do `CodeSnippetEmbed`, mas sem header e sem régua
 * de números — no espaço do card eles não cabem. O painel inteiro já é o
 * alvo de clique (o button pai do ItemCard abre o dialog), então aqui não
 * há nenhum gatilho próprio.
 *
 * O highlight é async e decorativo, igual ao embed: o primeiro paint mostra
 * as linhas em plaintext com a MESMA geometria do estado colorido (mesmas
 * divs, mesmo leading), então o colorir chega sem deslocar um pixel. Se o
 * highlight falhar, o silêncio é o estado de erro — as linhas plaintext já
 * estão na tela.
 *
 * O fade no pé é o sinal visual de "tem mais" (mesma linguagem do scrim que
 * AAA-180 colocou no card de link): só renderiza quando `contentPreview`
 * tem mais linhas do que o teto local. A truncagem do servidor (2000 chars)
 * continua dona do teto de payload — aqui é só a janela de 6 linhas.
 */
const MAX_LINES = 6;

export function CodeSnippetPreview({
  contentPreview,
  language,
}: {
  contentPreview: string;
  language: CodeLanguage | null;
}) {
  const source = contentPreview.replace(/\n$/, "");
  const truncated = source.split("\n").length > MAX_LINES;
  const visibleSource = source.split("\n").slice(0, MAX_LINES).join("\n");
  const lines = useHighlightedLines(visibleSource, language);

  return (
    <div className="relative overflow-hidden rounded-md bg-secondary p-3">
      {language && (
        <span
          aria-hidden="true"
          className="text-metadata absolute top-2 right-2 z-10 rounded border border-border/60 bg-card/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground select-none"
        >
          {CODE_LANGUAGE_LABELS[language] ?? language}
        </span>
      )}
      <div
        className="text-body-sm font-mono leading-6"
        style={{ color: "var(--code-foreground)" }}
      >
        {lines.map((line, index) => (
          // min-h-6 mantém a linha vazia com a mesma altura das demais, e
          // whitespace-pre + overflow-hidden do painel clipam linhas longas
          // na horizontal em vez de quebrar a grade do card.
          // Quando há badge de linguagem, a linha 0 trunca antes da badge
          // para não passar por baixo de seu fundo opaco.
          <div
            key={index}
            className={cn(
              "min-h-6 whitespace-pre",
              index === 0 &&
                language &&
                "max-w-[calc(100%-5.5rem)] overflow-hidden text-ellipsis",
            )}
          >
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
      {truncated && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-secondary to-transparent"
        />
      )}
    </div>
  );
}
