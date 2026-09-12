import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

// The page redirects to /library when signed in; this suite asserts the
// visitor-facing markup, so it always runs as anonymous.
vi.mock("@/lib/auth/require-user", () => ({
  getOptionalUser: vi.fn().mockResolvedValue(null),
}));

import HomePage from "@/app/page";

describe("HomePage (Landing Page)", () => {
  it("renders all core landmarks and sections with WCAG compliance", async () => {
    const pageComponent = await HomePage();
    const markup = renderToStaticMarkup(pageComponent);

    // Skip link
    expect(markup).toContain("Pular para o conteúdo principal");

    // Landmarks
    expect(markup).toContain("<header");
    expect(markup).toContain("<main");
    expect(markup).toContain("<footer");

    // Headings & Sections
    expect(markup).toContain("Organize a muvuca que você salva na internet.");
    expect(markup).toContain(
      "O trabalho real começa quando você esquece onde guardou",
    );
    expect(markup).toContain(
      "Uma biblioteca que continua legível quando cresce.",
    );
    expect(markup).toContain(
      "Organize uma vez e encontre por qualquer caminho depois.",
    );
    expect(markup).toContain("Você não precisa lembrar onde salvou.");
    expect(markup).toContain("Links e prompts convivem no mesmo acervo.");
    expect(markup).toContain(
      "Traga seus favoritos sem perder a estrutura de pastas.",
    );
    expect(markup).toContain("Você organiza cada coleção do seu jeito.");
    expect(markup).toContain("Transforme sua muvuca em uma biblioteca.");

    // Critical URLs
    expect(markup).toContain('href="/login"');
    expect(markup).toContain('href="/library"');
  });
});
