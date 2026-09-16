import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { PromptMarkdownPreview } from "./PromptMarkdownPreview";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

async function renderPreview(contentPreview: string) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(<PromptMarkdownPreview contentPreview={contentPreview} />);
  });

  return container;
}

/** Drena a promise do highlight (efeito async) aplicando cada setState dentro
 * de act, em passos de macrotask — cobre o init lazy do highlighter na
 * primeira chamada real da suíte. Mesma técnica do CodeSnippetPreview.test. */
async function flushHighlight(el: HTMLElement) {
  for (let i = 0; i < 40; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
    if (el.querySelector('[style*="--code-"]')) return;
  }
}

describe("PromptMarkdownPreview", () => {
  it("mostra o conteúdo em plaintext no primeiro paint, antes do highlight", async () => {
    const el = await renderPreview("## Persona\n\nVocê é um revisor.");

    // Sem esperar o efeito: o texto já está na tela, sem flash vazio.
    expect(el.textContent).toContain("## Persona");
    expect(el.textContent).toContain("Você é um revisor.");
  });

  it("colore código inline e link com cor de token depois do highlight", async () => {
    const el = await renderPreview(
      "## Persona\n\nCite `arquivo:linha` e veja [doc](https://x.dev).",
    );

    await flushHighlight(el);

    // Asserção deliberadamente estreita em `--code-token-*`: o tema devolve
    // `var(--code-foreground)` em quase todo token de markdown, então um
    // `[style*="--code-"]` genérico passaria mesmo sem nenhum realce real.
    const tokenColors = Array.from(
      el.querySelectorAll<HTMLElement>('span[style*="--code-token-"]'),
    ).map((span) => span.style.color);
    expect(tokenColors).toContain("var(--code-token-string)");
    expect(tokenColors).toContain("var(--code-token-link)");

    // Os marcadores continuam na tela: isto é highlight de sintaxe, não
    // renderização de markdown.
    expect(el.textContent).toContain("## Persona");
    expect(el.textContent).toContain("`arquivo:linha`");
  }, 15000);

  it("deixa heading e negrito sem cor de token (fontStyle não é carregado)", async () => {
    const el = await renderPreview("## Persona\n\nSeja **objetivo**.");

    await flushHighlight(el);

    // Documenta a limitação conhecida, não a celebra: o tema expressa
    // heading/negrito como `fontStyle: bold` e highlightCode descarta esse
    // campo. Se um dia ele passar a ser carregado, este teste falha e é o
    // lembrete de revisitar o componente.
    const heading = Array.from(el.querySelectorAll<HTMLElement>("span")).find(
      (span) => span.textContent?.includes("## Persona"),
    );
    expect(heading?.style.color).toBe("var(--code-foreground)");
    expect(heading?.style.fontWeight).toBe("");
  }, 15000);

  it("preserva as quebras de linha entre os tokens", async () => {
    const el = await renderPreview("linha 1\nlinha 2\nlinha 3");

    await flushHighlight(el);

    // O clamp é visual (CSS), então o texto renderizado precisa manter os
    // `\n` — sem eles as linhas colariam numa só e o line-clamp-6 contaria
    // errado.
    expect(el.textContent).toBe("linha 1\nlinha 2\nlinha 3");
  }, 15000);

  it("trata newline final como fim de linha, não como linha vazia extra", async () => {
    const el = await renderPreview("a\nb\n");

    expect(el.textContent).toBe("a\nb");
  });

  it("limita o que vai ao highlighter a 12 linhas de origem", async () => {
    const source = Array.from({ length: 20 }, (_, i) => `linha ${i + 1}`).join(
      "\n",
    );
    const el = await renderPreview(source);

    // O corte é de custo, não de layout: o clamp visível continua sendo o
    // line-clamp-6 do CSS, que jsdom não aplica.
    expect(el.textContent).toContain("linha 12");
    expect(el.textContent).not.toContain("linha 13");
  });

  it("mantém a moldura preenchida e o clamp do card", async () => {
    const el = await renderPreview("um prompt qualquer");

    const panel = el.querySelector("div");
    expect(panel?.className).toContain("bg-secondary");
    expect(el.querySelector("p")?.className).toContain("line-clamp-6");
  });
});
