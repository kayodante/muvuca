import { createHighlighterCore, createCssVariablesTheme } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import langTs from "shiki/langs/typescript.mjs";
import langJs from "shiki/langs/javascript.mjs";
import langTsx from "shiki/langs/tsx.mjs";
import langHtml from "shiki/langs/html.mjs";
import langCss from "shiki/langs/css.mjs";
import langPython from "shiki/langs/python.mjs";
import langSql from "shiki/langs/sql.mjs";
import langJson from "shiki/langs/json.mjs";
import langBash from "shiki/langs/bash.mjs";
import langGo from "shiki/langs/go.mjs";
import langRust from "shiki/langs/rust.mjs";
import langMarkdown from "shiki/langs/markdown.mjs";
import langYaml from "shiki/langs/yaml.mjs";

import type { CodeLanguage } from "./languages";

/** A single display token inside a rendered code line. `color` is a CSS
 * variable reference (`var(--code-…)`) produced by the CSS-variables theme;
 * tokens without a `color` (plain fallback) must inherit the default text
 * color of the surrounding code block. */
export type CodeToken = { content: string; color?: string };
export type CodeLine = CodeToken[];

/** Highlighter type derived from the factory's return value: `shiki/core`
 * does not re-export the `HighlighterCore` interface, so we take it from
 * `createHighlighterCore` instead of reaching into transitive packages. */
type CodeHighlighter = Awaited<ReturnType<typeof createHighlighterCore>>;

/** Name of the CSS-variables theme. The concrete palette values
 * (`--code-foreground`, `--code-token-keyword`, …) are defined in
 * `globals.css` (light/dark) — this module only emits the `var()` refs. */
const THEME = "muvuca-code";

const cssVarsTheme = createCssVariablesTheme({
  name: THEME,
  variablePrefix: "--code-",
  variableDefaults: {},
});

let highlighterPromise: Promise<CodeHighlighter> | null = null;

/** Lazily creates (and memoizes) the singleton highlighter. All supported
 * languages are loaded eagerly so `codeToTokens` can never fail with
 * "language not loaded" for a value of the `CodeLanguage` union. The regex
 * engine is the pure-JavaScript one: no WASM is ever compiled, which keeps
 * the CSP free of `wasm-unsafe-eval`. */
function getHighlighter(): Promise<CodeHighlighter> {
  highlighterPromise ??= createHighlighterCore({
    themes: [cssVarsTheme],
    langs: [
      langTs,
      langJs,
      langTsx,
      langHtml,
      langCss,
      langPython,
      langSql,
      langJson,
      langBash,
      langGo,
      langRust,
      langMarkdown,
      langYaml,
    ],
    engine: createJavaScriptRegexEngine(),
  }).catch((error: unknown) => {
    // Allow a later call to retry initialization instead of retaining a
    // permanently rejected singleton.
    highlighterPromise = null;
    throw error;
  });
  return highlighterPromise;
}

/** As linhas de `source` sem cor, no mesmo formato do caminho colorido.
 * Um `\n` final é o fim da última linha, não uma linha a mais: sem esse
 * strip o estado plaintext ganharia uma linha vazia a mais que o colorido. */
export function toPlainLines(source: string): CodeLine[] {
  return source
    .replace(/\n$/, "")
    .split("\n")
    .map((line) => [{ content: line }]);
}

/** Highlights `code` as plain tokens (never HTML — callers render React
 * `<span>`s per token, so there is no `dangerouslySetInnerHTML` at play).
 *
 * Fails soft by design: `null` language, an unknown/unloaded language,
 * or any internal tokenization error returns the source as uncolored lines
 * so a code block never breaks the card/dialog that contains it. All real
 * failure modes are covered by typing + eager language loading above; the
 * catch is the belt-and-suspenders for the rendering path. */
export async function highlightCode(
  code: string,
  language: CodeLanguage | null,
): Promise<CodeLine[]> {
  // Normalize once so highlighted and plain paths agree on line counts --
  // `toPlainLines` applies the same strip, so it takes the raw `code`.
  const source = code.replace(/\n$/, "");
  if (language === null || source === "") {
    return toPlainLines(code);
  }
  try {
    const highlighter = await getHighlighter();
    const { tokens } = highlighter.codeToTokens(source, {
      lang: language,
      theme: THEME,
    });
    return tokens.map((lineTokens) =>
      lineTokens.map(({ content, color }) => ({ content, color })),
    );
  } catch {
    // Intentional: highlight is decorative — degrade to plain text.
    return toPlainLines(code);
  }
}
