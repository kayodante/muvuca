/** Linguagens suportadas para highlight de code_component. Espelha a
 * constraint `library_items_language_allowed` da migration 0028 — o teste de
 * sincronia dessa paridade fica na Task 2 (a migration ainda não existe). */
export const CODE_LANGUAGES = [
  "typescript",
  "javascript",
  "tsx",
  "html",
  "css",
  "python",
  "sql",
  "json",
  "bash",
  "go",
  "rust",
  "markdown",
  "yaml",
] as const;

export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

export const CODE_LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  typescript: "TypeScript",
  javascript: "JavaScript",
  tsx: "TSX",
  html: "HTML",
  css: "CSS",
  python: "Python",
  sql: "SQL",
  json: "JSON",
  bash: "Bash",
  go: "Go",
  rust: "Rust",
  markdown: "Markdown",
  yaml: "YAML",
};
