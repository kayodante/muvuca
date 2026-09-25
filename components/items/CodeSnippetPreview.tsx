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
 * tem mais linhas do que o teto local. É máscara no texto, não gradiente
 * pintado por cima: um gradiente precisa casar com o fundo do painel, e no
 * hover do card o painel troca de cor -- o gradiente virava uma faixa no pé.
 * A truncagem do servidor (2000 chars) continua dona do teto de payload —
 * aqui é só a janela de 6 linhas.
 */
const MAX_LINES = 6;

/**
 * Moldura compartilhada com o PromptMarkdownPreview (Figma item-code/-prompt,
 * "Preview"): `surface` com `shadow-1` por cima e stroke interno de 0.5px.
 * O `shadow-1` é translúcido, então vai como background-image sobre o
 * background-color -- assim o hover (ItemCard troca a base para
 * `bg-secondary`) só anima a cor. Altura fixa para os dois painéis terem o
 * mesmo tamanho: `h-42` (168px) é p-3 + as 6 linhas de `leading-6` daqui.
 */
export const PREVIEW_PANEL =
  "h-42 overflow-hidden rounded-md bg-card bg-[linear-gradient(var(--shadow-1),var(--shadow-1))] p-3 inset-ring-[0.5px] inset-ring-border transition-colors duration-(--motion-slow) ease-out-muvuca motion-reduce:transition-none";

export function CodeSnippetPreview({
  contentPreview,
  language,
  className,
}: {
  contentPreview: string;
  language: CodeLanguage | null;
  className?: string;
}) {
  const source = contentPreview.replace(/\n$/, "");
  const truncated = source.split("\n").length > MAX_LINES;
  const visibleSource = source.split("\n").slice(0, MAX_LINES).join("\n");
  const lines = useHighlightedLines(visibleSource, language);

  return (
    <div className={cn("relative", PREVIEW_PANEL, className)}>
      {language && (
        <span
          aria-hidden="true"
          className="text-metadata absolute top-2 right-2 z-10 rounded border border-border/60 bg-card/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground select-none"
        >
          {CODE_LANGUAGE_LABELS[language] ?? language}
        </span>
      )}
      <div
        data-fade={truncated || undefined}
        className={cn(
          "text-body-sm font-mono leading-6",
          truncated &&
            "[mask-image:linear-gradient(to_bottom,black_calc(100%-1.25rem),transparent)]",
        )}
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
    </div>
  );
}
