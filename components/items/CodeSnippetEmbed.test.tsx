import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { highlightCode } from "@/lib/code/highlight";
import type { CodeLanguage } from "@/lib/code/languages";
import { CodeSnippetEmbed } from "./CodeSnippetEmbed";

const { toast } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("sonner", () => ({ toast }));

const { copyToClipboard } = vi.hoisted(() => ({
  copyToClipboard: vi.fn<(text: string) => Promise<boolean>>(),
}));

vi.mock("@/lib/clipboard", () => ({ copyToClipboard }));

// Highlight real (Shiki) por padrão — os testes de badge/gutter/copy passam
// pela pipeline de verdade. Apenas o teste de fallback troca o comportamento
// para uma rejeição, via mockRejectedValueOnce sobre este wrapper.
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

async function renderEmbed(
  content: string,
  language: CodeLanguage | null = null,
) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(<CodeSnippetEmbed content={content} language={language} />);
  });

  return container;
}

/** Drena a promise do highlight (efeito async) aplicando cada setState dentro
 * de act, em passos de macrotask — cobre o init lazy do highlighter na
 * primeira chamada real da suíte. */
async function flushHighlight(el: HTMLElement) {
  for (let i = 0; i < 40; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
    if (el.querySelector('[style*="--code-"]')) return;
  }
}

describe("CodeSnippetEmbed", () => {
  it("mostra o rótulo da linguagem quando language está definida", async () => {
    const el = await renderEmbed("const x = 1", "typescript");

    expect(el.textContent).toContain("code");
    expect(el.textContent).toContain("TypeScript");
  });

  it("omite o rótulo da linguagem quando language é null", async () => {
    const el = await renderEmbed("const x = 1", null);

    expect(el.textContent).toContain("code");
    expect(el.textContent).not.toContain("TypeScript");
    expect(el.textContent).not.toContain("JavaScript");
  });

  it("renderiza números de linha numa coluna própria, fora da árvore acessível", async () => {
    const el = await renderEmbed("a\nb\nc", null);

    const gutter = el.querySelector('div[aria-hidden="true"]');
    expect(gutter).not.toBeNull();
    expect(gutter?.textContent).toBe("123");

    // A régua tem um número por linha e o código não inclui os números.
    expect(gutter?.children).toHaveLength(3);
  });

  it("copia o conteúdo exato, sem números de linha, e confirma com toast", async () => {
    copyToClipboard.mockResolvedValue(true);
    const content = "const x = 1;\n// comenta";
    const el = await renderEmbed(content, "typescript");

    const copyButton = el.querySelector(
      'button[aria-label="Copiar código"]',
    ) as HTMLButtonElement | null;
    expect(copyButton).not.toBeNull();

    await act(async () => {
      copyButton?.click();
    });

    expect(copyToClipboard).toHaveBeenCalledWith(content);
    expect(toast.success).toHaveBeenCalledWith(
      "Código copiado para a área de transferência.",
    );
  });

  it("avisa com toast de erro quando a cópia falha", async () => {
    copyToClipboard.mockResolvedValue(false);
    const el = await renderEmbed("const x = 1;", "typescript");

    const copyButton = el.querySelector(
      'button[aria-label="Copiar código"]',
    ) as HTMLButtonElement | null;

    await act(async () => {
      copyButton?.click();
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Não foi possível copiar o código.",
    );
  });

  it("colore tokens com var(--code-*) depois do highlight assíncrono", async () => {
    const el = await renderEmbed("const x: number = 1;", "typescript");

    await flushHighlight(el);

    const colored = Array.from(
      el.querySelectorAll<HTMLElement>('span[style*="--code-"]'),
    );
    expect(colored.length).toBeGreaterThan(0);
    expect(colored[0]?.style.color).toContain("var(--code-");
    // O texto renderizado continua sendo o código fonte, sem perda.
    const codeSide = el.querySelector(
      'div[aria-hidden="true"]',
    )?.nextElementSibling;
    expect(codeSide?.textContent).toBe("const x: number = 1;");
  }, 15000);

  it("cai para plaintext sem quebrar quando o highlight rejeita", async () => {
    vi.mocked(highlightCode).mockRejectedValueOnce(new Error("shiki kaput"));

    const el = await renderEmbed("a\nb\nc", "typescript");

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
    });

    const gutter = el.querySelector('div[aria-hidden="true"]');
    expect(gutter?.textContent).toBe("123");
    expect(el.textContent).toContain("a");
    expect(el.textContent).toContain("b");
    expect(el.textContent).toContain("c");
    // Nenhum token colorido: o container base sempre leva
    // `color: var(--code-foreground)` (tema), então a prova do fallback é
    // a ausência de spans com var nos tokens.
    expect(el.querySelector('span[style*="--code-"]')).toBeNull();
  });

  it("mostra contadores de linhas e caracteres", async () => {
    const el = await renderEmbed("abc\ndef\nghi\n", null);

    expect(el.textContent).toContain("3 linhas");
    expect(el.textContent).toContain("12 caracteres");
    expect(el.textContent).toContain("·");
  });
});
