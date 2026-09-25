"use client";

import { Fragment } from "react";

import { cn } from "@/lib/utils";
import { PREVIEW_PANEL } from "./CodeSnippetPreview";
import { useHighlightedLines } from "./useHighlightedLines";

/**
 * Preview do card de `prompt`: o conteúdo salvo tokenizado como markdown,
 * porque na prática quase todo prompt é escrito em markdown. Não renderiza
 * markdown — `##` e `**` continuam na tela (nenhum HTML é produzido; cada
 * token vira um nó de texto React).
 *
 * Moldura de prosa, não de código: os tokens saem inline dentro de um único
 * `<p>`, com `\n` entre as linhas, porque `line-clamp-7` conta linhas
 * visuais de um bloco inline — uma div por linha (como no
 * CodeSnippetPreview) desligaria o clamp. Sete, não seis: o painel tem a
 * mesma altura do de código (PREVIEW_PANEL), e 7 linhas de `text-body-sm`
 * (~132px) são o que cabe nos 144px internos.
 *
 * O que de fato ganha cor é `` `código` `` e link. Heading e negrito o tema
 * de CSS variables do Shiki expressa como `fontStyle: bold`, campo que
 * `lib/code/highlight.ts` descarta ao montar o token — decisão de
 * 2026-09-16 de não mexer nesse módulo, já em produção pela AAA-106. Até lá,
 * `##` e `**` aparecem sem distinção visual.
 *
 * A cor base é `--code-foreground`, a mesma do CodeSnippetPreview, e não o
 * `text-muted-foreground` que esta preview usava antes. Não é preferência:
 * o mesmo tema devolve `var(--code-foreground)` explícito em quase todo
 * token de markdown, então uma base muted seria sobrescrita de qualquer
 * forma — declarar a cor aqui só evita o salto de contraste entre o
 * primeiro paint (plaintext, sem cor) e o estado colorido. Efeito prático
 * aceito: a preview de prompt passa a ter o mesmo peso da de código.
 *
 * O highlight é async e decorativo, igual aos irmãos de código: se falhar, o
 * silêncio é o estado de erro — o texto em plaintext já está na tela desde o
 * primeiro paint, na mesma geometria.
 */

/**
 * Teto de linhas mandadas ao highlighter. O clamp visível é o
 * `line-clamp-7` do CSS; este corte existe só para limitar o trabalho de
 * tokenização por card (são até 48 por página, cada um com até 2.000 chars
 * de `contentPreview` vindos truncados do servidor). Dobro do clamp: uma
 * linha de origem nunca ocupa menos de uma linha visual, então 14 linhas de
 * origem sempre cobrem as 7 visuais que o CSS pode mostrar.
 */
const MAX_SOURCE_LINES = 14;

export function PromptMarkdownPreview({
  contentPreview,
  className,
}: {
  contentPreview: string;
  className?: string;
}) {
  const source = contentPreview
    .replace(/\n$/, "")
    .split("\n")
    .slice(0, MAX_SOURCE_LINES)
    .join("\n");
  const lines = useHighlightedLines(source, "markdown");

  return (
    <div className={cn(PREVIEW_PANEL, className)}>
      <p
        dir="auto"
        className="text-body-sm line-clamp-7 [overflow-wrap:anywhere] whitespace-pre-line"
        style={{ color: "var(--code-foreground)" }}
      >
        {lines.map((line, index) => (
          <Fragment key={index}>
            {index > 0 && "\n"}
            {line.map((token, tokenIndex) =>
              token.color ? (
                <span key={tokenIndex} style={{ color: token.color }}>
                  {token.content}
                </span>
              ) : (
                <span key={tokenIndex}>{token.content}</span>
              ),
            )}
          </Fragment>
        ))}
      </p>
    </div>
  );
}
