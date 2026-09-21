import { test, expect, type Page } from "@playwright/test";

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
  const searchDemo = (page: Page) =>
    page
      .locator(".t-clear")
      .filter({ has: page.getByLabel("Demonstração interativa de busca") });

  test("anima com a curva do token, não com o fallback linear", async ({
    page,
  }) => {
    await page.goto("/");

    const demo = searchDemo(page);
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

  test("com prefers-reduced-motion não cria animação nenhuma", async ({
    page,
  }) => {
    // `test.use({ reducedMotion })` não propaga nesta versão do Playwright, e
    // o teste passaria sem nunca ter emulado nada. A preferência só vale como
    // premissa depois de ser lida de volta de dentro do browser.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(
      page.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    ).resolves.toBe(true);

    const demo = searchDemo(page);
    await demo.getByRole("button", { name: "Limpar busca" }).click();

    // O clear continua acontecendo -- o que some é o movimento. `.t-clear-mirror`
    // não tem `transition` em `globals.css`, então qualquer animação aqui só
    // pode ter vindo da Web Animations API.
    await expect(
      page.getByLabel("Demonstração interativa de busca"),
    ).toHaveValue("");
    await expect(
      demo
        .locator(".t-clear-mirror")
        .evaluate((element) => element.getAnimations().length),
    ).resolves.toBe(0);
  });
});

/**
 * A landing é dark-only: `app/page.tsx` força `className="dark"` na div
 * raiz, independente da preferência do SO. Isso só funciona porque
 * `app/globals.css` redeclara os tokens semânticos (`--background`,
 * `--foreground`, ...) e os aliases do Tailwind (`--color-background`,
 * `--color-foreground`, ...) dentro do próprio bloco `.dark` -- custom
 * property resolve `var()` no elemento que a declara, e uma subárvore
 * `.dark` fora de `:root` herdaria o valor claro já computado se esses
 * aliases só existissem em `:root`. Quem adicionar um token novo e
 * esquecer de espelhar no bloco `.dark` quebra a landing em silêncio, e só
 * sob preferência clara do SO -- este teste existe para pegar esse caso.
 */
test.describe("landing ignora prefers-color-scheme claro do SO", () => {
  test("mantém fundo escuro e texto claro mesmo com o SO em modo claro", async ({
    page,
  }) => {
    // `test.use({ colorScheme })` seria o caminho óbvio, mas o resto deste
    // arquivo já documenta que opções de `test.use` podem ser ignoradas
    // silenciosamente nesta versão do Playwright. `emulateMedia` mais a
    // leitura de volta é o padrão que o describe de reduced-motion acima
    // usa, e é o único que prova que a emulação pegou de verdade.
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");

    await expect(
      page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches),
    ).resolves.toBe(false);

    // Luminância relativa (sRGB, sem correção de gama -- suficiente para
    // distinguir "escuro" de "claro" por larga margem) a partir do
    // `rgb(...)` computado. Comparar por luminância, não por string de cor
    // exata, para não quebrar quando alguém só ajustar o hex de um token.
    const relativeLuminance = (rgb: string) => {
      const [r = 0, g = 0, b = 0] = (rgb.match(/[\d.]+/g) ?? []).map(Number);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const backgroundColor = await page
      .locator("div.dark")
      .first()
      .evaluate((element) => getComputedStyle(element).backgroundColor);
    const headlineColor = await page
      .getByRole("heading", { level: 1 })
      .evaluate((element) => getComputedStyle(element).color);

    expect(relativeLuminance(backgroundColor)).toBeLessThan(64);
    expect(relativeLuminance(headlineColor)).toBeGreaterThan(160);
  });
});
