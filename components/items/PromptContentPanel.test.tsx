import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { highlightCode, type CodeLine } from "@/lib/code/highlight";
import type { CodeLanguage } from "@/lib/code/languages";
import { PromptContentPanel } from "./PromptContentPanel";

// Highlight real (Shiki) por padrão — os testes da branch code passam pela
// pipeline de verdade (mesmo padrão de integração do CodeSnippetEmbed.test).
// O wrapper vi.fn() existe para provar que a linguagem chega ao highlight.
vi.mock("@/lib/code/highlight", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/code/highlight")>();
  return { ...actual, highlightCode: vi.fn(actual.highlightCode) };
});

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.clearAllMocks();
});

async function renderPanel(
  content: string,
  variant: "prompt" | "code_component" = "prompt",
  language: CodeLanguage | null = null,
) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(
      <PromptContentPanel
        content={content}
        variant={variant}
        language={language}
      />,
    );
  });

  return container;
}

describe("PromptContentPanel", () => {
  it("mostra o rótulo do tipo e os contadores de linha e caractere", async () => {
    const el = await renderPanel("linha um\nlinha dois");

    expect(el.textContent).toContain("prompt");
    expect(el.textContent).toContain("2 linhas");
    expect(el.textContent).toContain("19 caracteres");
  });

  it("não conta a quebra de linha final como uma linha a mais", async () => {
    const el = await renderPanel("linha um\nlinha dois\n");

    expect(el.textContent).toContain("2 linhas");
    expect(el.textContent).not.toContain("3 linhas");
  });

  it("usa singular quando há uma linha ou um caractere", async () => {
    const el = await renderPanel("x");

    expect(el.textContent).toContain("1 linha");
    expect(el.textContent).toContain("1 caractere");
    expect(el.textContent).not.toContain("1 linhas");
  });

  it("conta caracteres por code point, não por unidade UTF-16", async () => {
    // "🙂" ocupa 2 unidades UTF-16 mas é 1 caractere para o Postgres.
    const el = await renderPanel("🙂");

    expect(el.textContent).toContain("1 caractere");
  });

  it("delega code_component ao CodeSnippetEmbed: badge, linguagem e régua", async () => {
    const el = await renderPanel(
      "const x = 1;",
      "code_component",
      "typescript",
    );

    // O embed traz o próprio header: badge do tipo + nome da linguagem.
    expect(el.textContent).toContain("code");
    expect(el.textContent).toContain("TypeScript");

    // A régua é uma coluna irmã fora da árvore acessível, numerada 1..N.
    const gutter = el.querySelector('div[aria-hidden="true"]');
    expect(gutter?.textContent).toBe("1");

    // O embed não usa <pre><code>: cada linha é uma div de tokens.
    expect(el.querySelector("pre code")).toBeNull();

    // A linguagem chega ao highlight — o painel não a consome diretamente.
    expect(highlightCode).toHaveBeenCalledWith("const x = 1;", "typescript");
  });

  it("mostra o código em plaintext no primeiro paint e colore após o highlight", async () => {
    // O init do highlighter é uma cadeia de microtasks que o act drena na
    // renderização, então "ainda sem cor" só é observável de forma
    // determinística com o highlight pendente. O flush real do Shiki fica a
    // cargo do CodeSnippetEmbed.test.
    let resolveHighlight: ((lines: CodeLine[]) => void) | null = null;
    vi.mocked(highlightCode).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveHighlight = resolve;
        }),
    );

    const el = await renderPanel(
      "const a = 1;\nconst b = 2;",
      "code_component",
      "typescript",
    );

    // Primeiro paint: fallback plaintext, gutter 1..N, nenhum token colorido.
    const gutter = el.querySelector('div[aria-hidden="true"]');
    expect(gutter?.textContent).toBe("12");
    expect(el.textContent).toContain("const a = 1;");
    expect(el.textContent).toContain("const b = 2;");
    expect(el.querySelector('span[style*="--code-"]')).toBeNull();

    await act(async () => {
      resolveHighlight?.([
        [
          { content: "const", color: "var(--code-token-keyword)" },
          { content: " a = 1;" },
        ],
        [
          { content: "const", color: "var(--code-token-keyword)" },
          { content: " b = 2;" },
        ],
      ]);
    });

    const colored = Array.from(
      el.querySelectorAll<HTMLElement>('span[style*="--code-"]'),
    );
    expect(colored.length).toBe(2);
    expect(colored.map((span) => span.textContent)).toEqual(["const", "const"]);
  });

  it("preserva o conteúdo do prompt na íntegra", async () => {
    const el = await renderPanel("Escreva um conto\n\n  com recuo.");

    expect(el.textContent).toContain("Escreva um conto");
    expect(el.textContent).toContain("com recuo.");
  });

  it("realça menção, URL e caminho no conteúdo do prompt", async () => {
    const el = await renderPanel(
      "Leia @web, veja https://exemplo.com/x e edite src/index.ts.",
    );

    const marks = Array.from(el.querySelectorAll("[data-token-kind]"));
    expect(marks.map((m) => m.getAttribute("data-token-kind"))).toEqual([
      "mention",
      "url",
      "path",
    ]);
    expect(marks.map((m) => m.textContent)).toEqual([
      "@web",
      "https://exemplo.com/x",
      "src/index.ts",
    ]);
  });

  it("não transforma URL realçada em link navegável", async () => {
    const el = await renderPanel("veja https://exemplo.com/x");

    expect(el.querySelector("a")).toBeNull();
  });

  it("mantém o texto do prompt idêntico ao original mesmo com realce", async () => {
    const content = "Leia @web,\n  depois src/index.ts. Fim.";
    const el = await renderPanel(content);

    expect(el.querySelector("p")?.textContent).toBe(content);
  });
});
