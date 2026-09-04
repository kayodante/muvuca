import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { PromptContentPanel } from "./PromptContentPanel";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

async function renderPanel(
  content: string,
  variant: "prompt" | "code_component" = "prompt",
) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(<PromptContentPanel content={content} variant={variant} />);
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

  it("rotula code_component como code e usa <pre><code> monoespaçado", async () => {
    const el = await renderPanel("const a = 1;", "code_component");

    expect(el.textContent).toContain("code");
    const code = el.querySelector("pre code");
    expect(code).not.toBeNull();
    expect(code?.textContent).toBe("const a = 1;");
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

  it("não realça nada dentro de code_component", async () => {
    const el = await renderPanel(
      "const url = 'https://exemplo.com/x';",
      "code_component",
    );

    expect(el.querySelector("[data-token-kind]")).toBeNull();
  });
});
