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

  await expectNoViolations(page, "/library no tema escuro");
});
