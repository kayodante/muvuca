/**
 * Divide o conteúdo de um prompt em texto e referências reconhecíveis.
 *
 * Função pura: sem React, sem DOM, sem rede. O consumidor renderiza cada token
 * como nó de texto React; nada aqui produz HTML.
 *
 * A taxonomia é inspirada no bloco `f/ai-prompt`, mas com duas diferenças
 * deliberadas, porque lá os valores vêm de um campo de configuração do autor e
 * aqui vêm de prosa livre digitada pelo usuário:
 *
 * 1. `#alguma-coisa` não é reconhecido. Em prosa, `#` é heading de markdown ou
 *    número de issue muito mais vezes do que é referência a imagem.
 * 2. Arquivo sem barra exige extensão de uma allowlist, senão `etc.br` casa.
 */

export type PromptTokenKind = "text" | "mention" | "url" | "path" | "file";

export type PromptToken = { kind: PromptTokenKind; value: string };

/**
 * ponytail: acima deste tamanho o conteúdo volta como um bloco de texto só.
 * Um prompt pode ter 100.000 caracteres, e milhares de <span> no dialog custam
 * mais do que o realce vale. Se um dia isso incomodar, o caminho é virtualizar
 * o painel, não subir o teto.
 */
export const TOKENIZE_MAX_LENGTH = 20_000;

/** Caracteres que podem preceder uma referência sem quebrá-la. */
const OPENERS = new Set([
  " ",
  "\t",
  "\n",
  "\r",
  "(",
  "[",
  "{",
  "<",
  '"',
  "'",
  "«",
  "—",
  "–",
]);

/** Pontuação que costuma encerrar a frase e não faz parte da referência. */
const TRAILING = /[.,;:!?)\]}>"'»]+$/;

const EXTENSIONS = [
  "tsx",
  "ts",
  "jsx",
  "js",
  "mjs",
  "cjs",
  "json",
  "md",
  "mdx",
  "css",
  "scss",
  "html",
  "yml",
  "yaml",
  "toml",
  "sql",
  "sh",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "php",
  "txt",
  "csv",
  "env",
].join("|");

/**
 * Alternativas em ordem de prioridade. A URL vem primeiro para que o miolo de
 * `https://exemplo.com/a/b?u=@x` não seja reclassificado como caminho ou
 * menção — o `g` avança o `lastIndex` para depois do casamento inteiro.
 */
const TOKEN_RE = new RegExp(
  [
    "(https?:\\/\\/[^\\s<>\"']+)",
    "(@[A-Za-z0-9_][A-Za-z0-9_.-]*)",
    "([A-Za-z0-9_.-]+(?:\\/[A-Za-z0-9_.-]*)+)",
    `([A-Za-z0-9_-]+\\.(?:${EXTENSIONS})\\b)`,
  ].join("|"),
  "g",
);

const KIND_BY_GROUP = ["url", "mention", "path", "file"] as const;

/**
 * `word/word` sozinho é comum demais em prosa pt-BR (`26/08/2026`, `e/ou`,
 * `km/h`, `I/O`, `A/B`) para valer como referência. Só vira `path` quando o
 * último segmento tem extensão conhecida (`src/App.tsx`) ou quando a barra
 * final não tem nada depois dela (`src/components/`).
 */
const PATH_EXTENSION_RE = new RegExp(`\\.(?:${EXTENSIONS})$`);

function isRecognizedPath(value: string): boolean {
  const lastSegment = value.slice(value.lastIndexOf("/") + 1);
  return lastSegment === "" || PATH_EXTENSION_RE.test(lastSegment);
}

export function tokenizePromptContext(content: string): PromptToken[] {
  if (content === "") return [];
  if (content.length > TOKENIZE_MAX_LENGTH) {
    return [{ kind: "text", value: content }];
  }

  const tokens: PromptToken[] = [];
  let cursor = 0;

  TOKEN_RE.lastIndex = 0;
  for (const match of content.matchAll(TOKEN_RE)) {
    const start = match.index;
    const before = start === 0 ? undefined : content[start - 1];
    // Uma referência precisa começar em fronteira: sem isso `kayo@gmail.com`
    // viraria menção `@gmail.com`.
    if (before !== undefined && !OPENERS.has(before)) continue;

    const groupIndex = match.findIndex(
      (group, index) => index > 0 && group !== undefined,
    );
    if (groupIndex < 1) continue;

    const raw = match[groupIndex] as string;
    const value = raw.replace(TRAILING, "");
    if (value === "") continue;

    const kind = KIND_BY_GROUP[groupIndex - 1]!;
    if (kind === "path" && !isRecognizedPath(value)) continue;

    if (start > cursor) {
      tokens.push({ kind: "text", value: content.slice(cursor, start) });
    }
    tokens.push({ kind, value });
    cursor = start + value.length;
  }

  if (cursor < content.length) {
    tokens.push({ kind: "text", value: content.slice(cursor) });
  }

  return tokens;
}
