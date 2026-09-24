import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";

import { createRootTag, signIn } from "./helpers";

/**
 * Gate automatizado de acessibilidade. Substitui a revisão manual que a
 * Fase 7 do ROADMAP listava como pendência.
 *
 * As tags são as do WCAG 2.1 nível A e AA -- o que é objetivamente
 * verificável por máquina. axe não prova que a página é acessível; prova
 * que os defeitos que uma máquina consegue ver não estão lá. Teclado e
 * movimento continuam cobertos explicitamente, mais abaixo neste arquivo.
 */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/**
 * Dívida de acessibilidade aceita de forma explícita, não um falso positivo.
 *
 * Os passos ainda não revelados do scroll narrativo de `LandingProblem.tsx`
 * ficam em `opacity-40`, o que leva o texto a 1.76:1 contra AA de 4.5:1.
 * Nenhum valor de opacity resolve: a 40% nem preto puro sobre `--canvas`
 * passa de ~2.75:1, e `text-headline-sm` (18px/560) não se qualifica como
 * "large text" para o limite de 3:1. Ou seja, a única correção seria remover
 * o fade -- decisão de design, tomada conscientemente em favor do efeito e
 * registrada em `ROADMAP.md`.
 *
 * A exclusão é a mais estreita que dá: só os passos INATIVOS. O passo ativo
 * continua sendo varrido, e o resto da landing também. O custo aceito é que
 * outras violações dentro desses três nós também deixam de ser vistas.
 */
const NARRATIVE_CONTRAST_DEBT = ['[data-step-state="inactive"]'];

async function expectNoViolations(
  page: Page,
  context?: string,
  exclude: readonly string[] = [],
) {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  for (const selector of exclude) {
    builder = builder.exclude(selector);
  }

  const results = await builder.analyze();

  // A mensagem crua do axe é um objeto gigante e ilegível no relatório do
  // Playwright. Isto reduz cada violação a regra + impacto + seletor, que é
  // o que permite consertar sem reabrir o JSON.
  const summary = results.violations.map((violation) => ({
    rule: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => node.target.join(" ")),
  }));

  expect(summary, `violações de a11y em ${context ?? page.url()}`).toEqual([]);
}

test("a landing pública não tem violações de a11y", async ({ page }) => {
  await page.goto("/");
  await expectNoViolations(page, "/", NARRATIVE_CONTRAST_DEBT);
});

test("o login não tem violações de a11y", async ({ page }) => {
  await page.goto("/login");
  await expectNoViolations(page, "/login");
});

test("a biblioteca vazia não tem violações de a11y", async ({ page }) => {
  await signIn(page, `e2e-a11y-library-${Date.now()}@muvuca.test`);
  await expect(page).toHaveURL(/\/library/);
  await expectNoViolations(page, "/library (vazia)");
});

test("as configurações não têm violações de a11y", async ({ page }) => {
  await signIn(page, `e2e-a11y-settings-${Date.now()}@muvuca.test`);
  await page.goto("/settings");
  await expect(page.getByRole("region", { name: "Aparência" })).toBeVisible();
  await expectNoViolations(page, "/settings");
});

test("a lista de tags com conteúdo não tem violações de a11y", async ({
  page,
}) => {
  await signIn(page, `e2e-a11y-tags-${Date.now()}@muvuca.test`);
  await createRootTag(page, "Acessibilidade");
  await expectNoViolations(page, "/tags (com conteúdo)");
});

test("o diálogo de nova tag não tem violações de a11y", async ({ page }) => {
  await signIn(page, `e2e-a11y-dialog-${Date.now()}@muvuca.test`);
  await page.goto("/tags");
  await page.getByRole("button", { name: "Criar tag" }).first().click();

  const dialog = page.getByRole("dialog", { name: "Nova tag" });
  await expect(dialog).toBeVisible();

  await expectNoViolations(page, "/tags com o diálogo Nova tag aberto");
});

test("o tema escuro não tem violações de contraste", async ({ page }) => {
  await signIn(page, `e2e-a11y-dark-${Date.now()}@muvuca.test`);

  const nav = page.getByRole("navigation", { name: "Navegação principal" });
  await nav.getByRole("button", { name: "Tema: Sistema" }).click();
  await page.getByRole("menuitem", { name: "Escuro" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  // A classe em <html> NÃO prova que o menu fechou: ela vem do revalidate da
  // Server Action, enquanto o fechamento é estado do Base UI, e num runner
  // lento o segundo chega depois do primeiro. Medir a11y nesse intervalo
  // varre um menu modal aberto, e os focus guards do Base UI (`aria-hidden`
  // com `tabindex=0`, ver FocusGuard) acusam `aria-hidden-focus` -- defeito
  // do instante da medição, não do tema escuro que este teste existe para
  // cobrir. Confirmado no trace do CI: `role=menu`, `data-popup-open` e
  // `data-base-ui-inert` presentes no snapshot da falha.
  await expect(page.getByRole("menu")).toHaveCount(0);

  await expectNoViolations(page, "/library no tema escuro");
});

/**
 * A preferência é emulada por `page.emulateMedia`, e não pelo
 * `test.use({ reducedMotion: "reduce" })` que a documentação sugere: no
 * Playwright 1.62.1 essa opção de contexto **não chega ao navegador**
 * (`matchMedia("(prefers-reduced-motion: reduce)").matches` continua `false`),
 * enquanto `colorScheme` no mesmo `test.use` funciona. Como a falha é
 * silenciosa, ela não quebra o teste -- apenas o esvazia, que é pior: a
 * asserção passaria a medir a página sem a preferência ligada.
 *
 * Por isso `expectReducedMotion` confere a emulação antes de cada asserção.
 * A guarda é o que impede este arquivo de voltar a aprovar nada.
 */
async function expectReducedMotion(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    "emulação de prefers-reduced-motion não chegou à página",
  ).toBe(true);
}

test.describe("movimento reduzido", () => {
  test("zera as transições dos overlays quando o sistema pede menos movimento", async ({
    page,
  }) => {
    await signIn(page, `e2e-a11y-motion-${Date.now()}@muvuca.test`);
    await expectReducedMotion(page);
    await page.goto("/tags");
    await page.getByRole("button", { name: "Criar tag" }).first().click();

    const dialog = page.getByRole("dialog", { name: "Nova tag" });
    await expect(dialog).toBeVisible();

    // O bloco @media (prefers-reduced-motion: reduce) de app/globals.css
    // zera `.t-modal` com `transition: none !important`. Se alguém mover a
    // animação do modal para uma classe fora daquele bloco, isto falha.
    const motion = await dialog.evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        transitionDuration: style.transitionDuration,
        animationDuration: style.animationDuration,
      };
    });

    expect(motion.transitionDuration).toMatch(/^0s(, 0s)*$/);
    expect(motion.animationDuration).toMatch(/^0s(, 0s)*$/);
  });

  test("a landing continua sem violações de a11y com movimento reduzido", async ({
    page,
  }) => {
    await expectReducedMotion(page);
    await page.goto("/");
    await expectNoViolations(
      page,
      "/ com prefers-reduced-motion: reduce",
      NARRATIVE_CONTRAST_DEBT,
    );
  });
});

test("o diálogo prende o foco e o Escape devolve para o gatilho", async ({
  page,
}) => {
  await signIn(page, `e2e-a11y-focus-${Date.now()}@muvuca.test`);
  await page.goto("/tags");

  const trigger = page.getByRole("button", { name: "Criar tag" }).first();
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Nova tag" });
  await expect(dialog).toBeVisible();

  // O foco tem de entrar no diálogo, não ficar no gatilho atrás do overlay.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const active = document.activeElement;
          return active ? active.closest("[role='dialog']") !== null : false;
        }),
      { message: "foco deveria estar dentro do diálogo" },
    )
    .toBe(true);

  // Tab não pode escapar do diálogo enquanto ele é modal.
  //
  // A asserção espera o foco assentar em vez de ler `activeElement` logo
  // depois da tecla, e isso é essencial: ao passar do último elemento o foco
  // cai por um instante num "focus guard" do Base UI (um `<span tabindex=0>`
  // com `data-base-ui-focus-guard`, renderizado FORA do popup), que só então
  // devolve o foco para o primeiro campo. A devolução é assíncrona. Ler na
  // hora pega o guard e acusa vazamento onde a prisão está funcionando --
  // pior, tabular de novo a partir do guard, antes da devolução, faz o foco
  // escapar de verdade e o teste passa a medir a corrida que ele mesmo criou.
  for (let i = 0; i < 10; i += 1) {
    await page.keyboard.press("Tab");
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const active = document.activeElement;
            return active ? active.closest("[role='dialog']") !== null : false;
          }),
        { message: `Tab #${i + 1} escapou do diálogo` },
      )
      .toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("o alternador de tema é alcançável por teclado e mostra o foco", async ({
  page,
}) => {
  await signIn(page, `e2e-a11y-keyboard-${Date.now()}@muvuca.test`);
  await expect(page).toHaveURL(/\/library/);

  const themeButton = page.getByRole("button", { name: /^Tema:/ });
  await expect(themeButton).toBeVisible();

  // Tabula até alcançar o botão. Chegar lá já é metade da asserção: prova
  // que o controle está na ordem de tabulação. O foco é movido por teclado
  // de propósito -- `element.focus()` via JS não casa `:focus-visible` num
  // <button> no Chromium, e o anel do repo é `focus-visible:ring-2`.
  let reached = false;
  for (let i = 0; i < 40 && !reached; i += 1) {
    await page.keyboard.press("Tab");
    reached = await themeButton.evaluate(
      (node) => node === document.activeElement,
    );
  }

  expect(reached, "botão de tema não alcançado em 40 tabulações").toBe(true);

  // `outline: none` sem substituto é a forma mais comum de quebrar navegação
  // por teclado, e a revisão manual não pega porque quem revisa usa mouse.
  // O anel do Tailwind sai como box-shadow, então qualquer um dos dois vale.
  const indicator = await themeButton.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
    };
  });

  const hasIndicator =
    (indicator.outlineStyle !== "none" && indicator.outlineWidth !== "0px") ||
    indicator.boxShadow !== "none";

  expect(
    hasIndicator,
    `botão de tema focado sem indicador visível: ${JSON.stringify(indicator)}`,
  ).toBe(true);
});

test("a tabulação nunca para em um elemento de tamanho zero", async ({
  page,
}) => {
  await signIn(page, `e2e-a11y-tabstops-${Date.now()}@muvuca.test`);
  await expect(page).toHaveURL(/\/library/);

  // Um elemento focável com 0x0 é foco que some: o usuário de teclado
  // aperta Tab, nada aparenta mudar, e ele fica preso sem saber onde está.
  // Esta asserção é deliberadamente estreita -- nada de exigir indicador em
  // toda parada, porque há controles que delegam o anel a um filho ou a um
  // `group-focus-visible` do pai, e a checagem genérica acusaria falso.
  for (let i = 0; i < 20; i += 1) {
    await page.keyboard.press("Tab");

    const stop = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active || active === document.body) return null;
      // Os focus guards do Base UI são 1x1px de propósito (é assim que ficam
      // fora da tela sem sair da ordem de tabulação), então são a única
      // parada legítima que esta asserção precisa ignorar.
      if (active.hasAttribute("data-base-ui-focus-guard")) return null;

      const rect = active.getBoundingClientRect();
      return {
        tag: active.tagName,
        label: active.getAttribute("aria-label") ?? active.textContent?.trim(),
        width: rect.width,
        height: rect.height,
      };
    });

    if (!stop) continue;

    expect(
      stop.width > 0 && stop.height > 0,
      `Tab #${i + 1} parou em ${stop.tag} (${stop.label}) com ${stop.width}x${stop.height}`,
    ).toBe(true);
  }
});
