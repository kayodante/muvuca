import { describe, expect, it } from "vitest";
import {
  tokenizePromptContext,
  TOKENIZE_MAX_LENGTH,
  type PromptToken,
} from "./context-tokens";

/** Só os tokens realçados, para asserções curtas. */
function refs(content: string): PromptToken[] {
  return tokenizePromptContext(content).filter((t) => t.kind !== "text");
}

/** O conteúdo reconstruído tem de ser idêntico à entrada. */
function rebuild(content: string): string {
  return tokenizePromptContext(content)
    .map((t) => t.value)
    .join("");
}

describe("tokenizePromptContext", () => {
  it("devolve lista vazia para conteúdo vazio", () => {
    expect(tokenizePromptContext("")).toEqual([]);
  });

  it("devolve um único token de texto quando não há referência", () => {
    expect(tokenizePromptContext("Escreva um conto curto.")).toEqual([
      { kind: "text", value: "Escreva um conto curto." },
    ]);
  });

  it("reconhece menção no início e depois de espaço", () => {
    expect(refs("@web e também @claude-code")).toEqual([
      { kind: "mention", value: "@web" },
      { kind: "mention", value: "@claude-code" },
    ]);
  });

  it("não trata e-mail como menção", () => {
    expect(refs("Escreva para kayo@gmail.com hoje.")).toEqual([]);
  });

  it("reconhece URL http e https", () => {
    expect(refs("Veja https://exemplo.com/spec agora")).toEqual([
      { kind: "url", value: "https://exemplo.com/spec" },
    ]);
  });

  it("não engole pontuação final da URL", () => {
    expect(refs("Veja https://exemplo.com.")).toEqual([
      { kind: "url", value: "https://exemplo.com" },
    ]);
  });

  it("não engole parêntese de fechamento da URL", () => {
    expect(refs("(https://exemplo.com)")).toEqual([
      { kind: "url", value: "https://exemplo.com" },
    ]);
  });

  it("reconhece caminho com barra", () => {
    expect(refs("edite src/components/ItemCard.tsx por favor")).toEqual([
      { kind: "path", value: "src/components/ItemCard.tsx" },
    ]);
  });

  it("reconhece arquivo solto com extensão conhecida", () => {
    expect(refs("abra ItemCard.tsx")).toEqual([
      { kind: "file", value: "ItemCard.tsx" },
    ]);
  });

  it("não trata sufixo de domínio solto como arquivo", () => {
    expect(refs("site etc.br e mais nada")).toEqual([]);
  });

  it("não trata heading de markdown como referência", () => {
    expect(refs("# Título\n## Subtítulo")).toEqual([]);
  });

  it("não trata número de issue como referência", () => {
    expect(refs("resolve #123 antes de tudo")).toEqual([]);
  });

  it("não reclassifica o interior de uma URL como caminho ou menção", () => {
    expect(refs("https://exemplo.com/a/b?u=@x")).toEqual([
      { kind: "url", value: "https://exemplo.com/a/b?u=@x" },
    ]);
  });

  it("preserva o conteúdo original ao reconstruir", () => {
    const content =
      "Leia @web,\n  depois src/index.ts e https://exemplo.com/x. Fim.";
    expect(rebuild(content)).toBe(content);
  });

  it("devolve um único token de texto acima do teto de tamanho", () => {
    const huge = `@web ${"a".repeat(TOKENIZE_MAX_LENGTH)}`;
    expect(tokenizePromptContext(huge)).toEqual([
      { kind: "text", value: huge },
    ]);
  });

  it("tokeniza normalmente no teto exato de TOKENIZE_MAX_LENGTH", () => {
    const prefix = "@web ";
    const content = prefix + "a".repeat(TOKENIZE_MAX_LENGTH - prefix.length);
    expect(content.length).toBe(TOKENIZE_MAX_LENGTH);
    expect(refs(content)).toEqual([{ kind: "mention", value: "@web" }]);
  });

  it("não trata data como caminho", () => {
    expect(refs("Entregue até 26/08/2026")).toEqual([]);
  });

  it("não trata 24/7 nem e/ou como caminho", () => {
    expect(refs("disponível 24/7 e/ou sob demanda")).toEqual([]);
  });

  it("não trata km/h como caminho", () => {
    expect(refs("roda a 80 km/h")).toEqual([]);
  });

  it("não trata I/O nem A/B como caminho", () => {
    expect(refs("Escreva sobre I/O e A/B testing")).toEqual([]);
  });
});
