import { test, expect } from "@playwright/test";

/**
 * A revelação de entrada (`.t-stagger-line`) parte de `opacity: 0` e depende do
 * `IntersectionObserver` em `ScrollReveal`. Estes testes fixam o contrato de que
 * o conteúdo continua legível quando esse caminho não roda: sem scripting, e
 * quando o usuário pediu menos movimento.
 *
 * `toBeVisible()` não serve aqui: o Playwright considera visível um elemento com
 * `opacity: 0`. A asserção precisa ler o valor computado.
 */

const HEADLINE_ABAIXO_DA_DOBRA =
  "Uma biblioteca que continua legível quando cresce.";

test.describe("landing sem JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("renderiza as seções abaixo da dobra em opacidade cheia", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS(
      "opacity",
      "1",
    );
    await expect(
      page.getByRole("heading", { name: HEADLINE_ABAIXO_DA_DOBRA }),
    ).toHaveCSS("opacity", "1");
  });
});

test.describe("landing com prefers-reduced-motion", () => {
  // `reducedMotion` só existe em `contextOptions` nesta versão do Playwright,
  // não como opção de nível superior de `PlaywrightTestOptions`.
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("não esconde conteúdo à espera da revelação por scroll", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: HEADLINE_ABAIXO_DA_DOBRA }),
    ).toHaveCSS("opacity", "1");
  });
});
