import { test, expect } from "@playwright/test";
import { ptBR } from "../lib/i18n/dictionaries/pt-BR";

test("tabs switch by keyboard, FAQ expands, and all artwork loads locally", async ({
  page,
}) => {
  await page.goto("/");
  const library = page.getByRole("tab", { name: "Biblioteca", exact: true });
  await library.focus();
  await library.press("ArrowRight");
  const tags = page.getByRole("tab", { name: "Tags", exact: true });
  await expect(tags).toBeFocused();
  await tags.press("Enter");
  await expect(tags).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("tabpanel", { name: "Tags", exact: true }),
  ).toContainText("Conexões que fazem sentido.");
  await page.getByRole("tab", { name: "Importação", exact: true }).click();
  await expect(
    page.getByRole("tabpanel", { name: "Importação", exact: true }),
  ).toContainText("Suas descobertas vêm junto.");

  await page.getByText("Minha biblioteca é pública?", { exact: true }).click();
  await expect(
    page.getByText(/Sua biblioteca é privada e vinculada à sua conta/),
  ).toBeVisible();

  const images = page.locator("main img");
  for (const img of await images.all()) {
    await img.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        img.evaluate(
          (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
        ),
      )
      .toBe(true);
    expect(await img.getAttribute("src")).toMatch(/^\//);
  }
});

test("mobile menu navigates, closes and fits a narrow screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Abrir menu de navegação" });
  await trigger.click();
  const menu = page.getByRole("dialog", { name: "Explore o Muvuca" });
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "Recursos", exact: true }).click();
  await expect(menu).toBeHidden();
  await expect(page).toHaveURL(/#recursos$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("tab", { name: "Prompts", exact: true }).click();
  await expect(
    page.getByRole("tabpanel", { name: "Prompts", exact: true }),
  ).toContainText("Pronto para usar de novo.");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("keeps the story, initial media and native FAQ readable", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS(
      "opacity",
      "1",
    );
    await expect(
      page.getByRole("heading", { name: ptBR.landing.features.title }),
    ).toHaveCSS("opacity", "1");
    await page
      .getByText("Minha biblioteca é pública?", { exact: true })
      .click();
    await expect(
      page.getByText(/Sua biblioteca é privada e vinculada à sua conta/),
    ).toBeVisible();
  });
});

test("stays dark under light OS preferences, including the language popup", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/");
  const root = page.locator("div.dark").first();
  await expect(root).toHaveCSS("background-color", "rgb(8, 7, 8)");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCSS(
    "color",
    "rgb(241, 239, 245)",
  );
  const language = page.getByRole("button", {
    name: "Idioma: Português (Brasil)",
  });
  await language.click();
  await expect(page.getByRole("menu")).toHaveCSS(
    "background-color",
    "rgb(18, 17, 19)",
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: ptBR.landing.features.title }),
  ).toHaveCSS("opacity", "1");
});
