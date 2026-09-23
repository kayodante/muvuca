import { test, expect, type Page } from "@playwright/test";

import { signIn } from "./helpers";
import { dictionaries } from "../lib/i18n/dictionaries";
import { en } from "../lib/i18n/dictionaries/en";
import { ptBR } from "../lib/i18n/dictionaries/pt-BR";
import type { Locale } from "../lib/i18n/config";

/**
 * Accessible name of the language picker's trigger button for a given
 * active locale, computed from the real dictionaries instead of a hardcoded
 * copy: `LanguageSelect`'s aria-label reflects the currently active
 * dictionary and the currently selected option's display name (which is the
 * same string in both dictionaries -- see `common.localeNames`).
 */
function languageTriggerName(activeLocale: Locale): string {
  const dict = dictionaries[activeLocale];
  return dict.settings.language.ariaLabel(
    dict.common.localeNames[activeLocale],
  );
}

/** Opens the language picker (assumed to reflect `from`) and picks `to`. */
async function switchLanguage(page: Page, from: Locale, to: Locale) {
  await page.getByRole("button", { name: languageTriggerName(from) }).click();
  await page
    .getByRole("menuitem", { name: dictionaries[to].common.localeNames[to] })
    .click();
}

async function htmlLang(page: Page): Promise<string> {
  return page.evaluate(() => document.documentElement.lang);
}

test.describe("logged-out landing follows Accept-Language", () => {
  // `locale` is a top-level Playwright test option (unlike `reducedMotion`,
  // which this version of Playwright only reads from `contextOptions` --
  // see landing.spec.ts). Asserting `html[lang]` below proves it took
  // effect instead of trusting that distinction blindly.
  test.use({ locale: "en-US" });

  test("renders the landing page in English", async ({ page }) => {
    await page.goto("/");

    expect(await htmlLang(page)).toBe("en");
    await expect(
      page.getByRole("heading", { level: 1, name: en.landing.hero.title }),
    ).toBeVisible();
    await expect(page.getByText(en.landing.footer.tagline)).toBeVisible();
  });
});

test("logged-out footer language switch persists across reload", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: ptBR.landing.hero.title }),
  ).toBeVisible();

  await switchLanguage(page, "pt-BR", "en");

  await expect(
    page.getByRole("heading", { level: 1, name: en.landing.hero.title }),
  ).toBeVisible();
  expect(await htmlLang(page)).toBe("en");

  await page.reload();

  await expect(
    page.getByRole("heading", { level: 1, name: en.landing.hero.title }),
  ).toBeVisible();
  expect(await htmlLang(page)).toBe("en");
});

test("logged-in language preference: settings, reload, library, cross-context persistence, and switch back", async ({
  page,
  browser,
}) => {
  const email = `e2e-i18n-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { level: 1, name: ptBR.settings.title }),
  ).toBeVisible();

  await switchLanguage(page, "pt-BR", "en");

  await expect(
    page.getByRole("heading", { level: 1, name: en.settings.title }),
  ).toBeVisible();
  expect(await htmlLang(page)).toBe("en");

  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: en.settings.title }),
  ).toBeVisible();

  await page.goto("/library");
  await expect(
    page.getByRole("button", { name: en.shell.topbar.createItem }).first(),
  ).toBeVisible();

  // Persistence across contexts: the saved DB preference (en) must beat a
  // brand-new context's `pt-BR` Accept-Language for the same user.
  const ptContext = await browser.newContext({ locale: "pt-BR" });
  const ptPage = await ptContext.newPage();
  await signIn(ptPage, email);
  await ptPage.goto("/settings");
  await expect(
    ptPage.getByRole("heading", { level: 1, name: en.settings.title }),
  ).toBeVisible();
  await ptContext.close();

  // Switch back to Português so this test's user ends in pt-BR.
  await page.goto("/settings");
  await switchLanguage(page, "en", "pt-BR");

  await expect(
    page.getByRole("heading", { level: 1, name: ptBR.settings.title }),
  ).toBeVisible();
  expect(await htmlLang(page)).toBe("pt-BR");
});
