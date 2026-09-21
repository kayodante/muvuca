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

/**
 * A animação de clear da busca lia o token `--clear-out-ease` com uma regex
 * própria, e a cópia do landing rejeitava os espaços com que o token é escrito
 * -- caía em linear sem erro nenhum. Agora a curva vai direto para a Web
 * Animations API, então o teste lê de volta o que o motor de animação recebeu.
 */
test.describe("clear da busca do landing", () => {
  test("anima com a curva do token, não com o fallback linear", async ({
    page,
  }) => {
    await page.goto("/");

    const demo = page
      .locator(".t-clear")
      .filter({ has: page.getByLabel("Demonstração interativa de busca") });
    await demo.getByRole("button", { name: "Limpar busca" }).click();

    const easings = await demo.locator(".t-clear-mirror").evaluate((element) =>
      element.getAnimations().map((animation) => {
        const timing = animation.effect?.getTiming();
        return typeof timing?.easing === "string" ? timing.easing : "";
      }),
    );

    const token = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--clear-out-ease")
        .trim(),
    );

    // Comparação numérica: o token sai do minificador como `.22` e a WAAPI
    // devolve `0.22` -- mesma curva, serialização diferente. O espaço depois
    // da vírgula é o detalhe que derrubava a regex antiga, então fica asserido.
    const numbers = (value: string) =>
      (value.match(/[-\d.]+/g) ?? []).map(Number);
    expect(token).toContain(" ");
    expect(easings.map(numbers)).toContainEqual(numbers(token));
  });
});
