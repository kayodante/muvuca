"use client";

import { useEffect, useState } from "react";

import { highlightCode, type CodeLine } from "@/lib/code/highlight";
import type { CodeLanguage } from "@/lib/code/languages";

/**
 * As linhas de `source` com os tokens coloridos pelo Shiki, num estado que
 * nunca passa por "vazio": o primeiro paint já devolve o conteúdo em
 * plaintext e o efeito troca pelas linhas coloridas quando o highlight
 * resolve. Quem renderiza só precisa mapear tokens -> spans.
 *
 * Terceira cópia do mesmo efeito quando foi extraído (CodeSnippetEmbed,
 * CodeSnippetPreview e PromptMarkdownPreview). Comportamento idêntico ao que
 * as duas primeiras faziam inline — inclusive o detalhe de que trocar
 * `source` mantém as linhas antigas até o novo highlight resolver, já que o
 * estado inicial só roda na montagem.
 */
function toPlainLines(source: string): CodeLine[] {
  // Um `\n` final é o fim da última linha, não uma linha a mais — mesma
  // normalização que o próprio highlightCode faz, senão o estado plaintext
  // teria uma linha vazia a mais que o estado colorido.
  return source
    .replace(/\n$/, "")
    .split("\n")
    .map((line) => [{ content: line }]);
}

export function useHighlightedLines(
  source: string,
  language: CodeLanguage | null,
): CodeLine[] {
  const [lines, setLines] = useState<CodeLine[]>(() => toPlainLines(source));

  useEffect(() => {
    let cancelled = false;
    highlightCode(source, language)
      .then((result) => {
        if (!cancelled) setLines(result);
      })
      .catch(() => {
        // highlightCode já tem fallback plaintext interno; esta catch é o
        // segundo cinto — uma rejeição aqui nunca pode virar unhandled
        // rejection na árvore que consome o hook. As linhas do estado
        // inicial já são o conteúdo correto, só que sem cor.
      });
    return () => {
      cancelled = true;
    };
  }, [source, language]);

  return lines;
}
