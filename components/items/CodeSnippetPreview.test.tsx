import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import type { CodeLanguage } from "@/lib/code/languages";
import { CodeSnippetPreview } from "./CodeSnippetPreview";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

async function renderPreview(
  contentPreview: string,
  language: CodeLanguage | null = null,
) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(
      <CodeSnippetPreview
        contentPreview={contentPreview}
        language={language}
      />,
    );
  });

  return container;
}

/** Drena a promise do highlight (efeito async) aplicando cada setState dentro
 * de act, em passos de macrotask — cobre o init lazy do highlighter na
 * primeira chamada real da suíte. Mesma técnica do CodeSnippetEmbed.test. */
async function flushHighlight(el: HTMLElement) {
  for (let i = 0; i < 40; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
    if (el.querySelector('[style*="--code-"]')) return;
  }
}

// O fade é o gradiente absoluto no pé do painel — só existe sob truncamento.
const FADE_SELECTOR = ".bg-gradient-to-t";

describe("CodeSnippetPreview", () => {
  it("trunca em 6 linhas e mostra o fade quando o conteúdo tem mais", async () => {
    const source = Array.from({ length: 8 }, (_, i) => `linha ${i + 1}`).join(
      "\n",
    );
    const el = await renderPreview(source);

    const codeLines = el.querySelectorAll(".whitespace-pre");
    expect(codeLines).toHaveLength(6);
    expect(codeLines[0]?.textContent).toBe("linha 1");
    expect(codeLines[5]?.textContent).toBe("linha 6");
    // A linha 7 não entra no painel.
    expect(el.textContent).not.toContain("linha 7");

    expect(el.querySelector(FADE_SELECTOR)).not.toBeNull();
  });

  it("colore tokens com var(--code-*) depois do highlight assíncrono", async () => {
    const el = await renderPreview("def main():\n    return 42", "python");

    await flushHighlight(el);

    const colored = Array.from(
      el.querySelectorAll<HTMLElement>('span[style*="--code-"]'),
    );
    expect(colored.length).toBeGreaterThan(0);
    expect(colored[0]?.style.color).toContain("var(--code-");
    // O conteúdo renderizado continua sendo o código fonte, sem perda.
    expect(el.textContent).toContain("def main():");
    expect(el.textContent).toContain("return 42");
  }, 15000);

  it("não renderiza fade quando o conteúdo cabe em até 6 linhas", async () => {
    const el = await renderPreview("const a = 1;\nconst b = 2;", null);

    expect(el.querySelector(FADE_SELECTOR)).toBeNull();
    expect(el.querySelectorAll(".whitespace-pre")).toHaveLength(2);
  });

  it("trata newline final como fim de linha, não como linha vazia extra", async () => {
    const el = await renderPreview("a\nb\n", null);

    expect(el.querySelectorAll(".whitespace-pre")).toHaveLength(2);
    expect(el.querySelector(FADE_SELECTOR)).toBeNull();
  });
});
