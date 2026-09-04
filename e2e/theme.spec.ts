import { test, expect } from "@playwright/test";

import { signIn } from "./helpers";

test("alterna entre claro, escuro e sistema pela sidebar", async ({ page }) => {
  const email = `e2e-theme-${Date.now()}@muvuca.test`;
  await signIn(page, email);
  await expect(page).toHaveURL(/\/library/);

  const nav = page.getByRole("navigation", { name: "Navegação principal" });

  await nav.getByRole("button", { name: "Tema: Sistema" }).click();
  await page.getByRole("menuitem", { name: "Escuro" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await nav.getByRole("button", { name: "Tema: Escuro" }).click();
  await page.getByRole("menuitem", { name: "Claro" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);

  await nav.getByRole("button", { name: "Tema: Claro" }).click();
  await page.getByRole("menuitem", { name: "Sistema" }).click();
  await expect(
    nav.getByRole("button", { name: "Tema: Sistema" }),
  ).toBeVisible();
});

test("a preferência de tema persiste em uma nova sessão do mesmo usuário", async ({
  page,
}) => {
  const email = `e2e-theme-persist-${Date.now()}@muvuca.test`;

  await signIn(page, email);
  await page.goto("/settings");

  await page
    .getByRole("region", { name: "Aparência" })
    .getByRole("button", { name: "Tema: Sistema" })
    .click();
  await page.getByRole("menuitem", { name: "Escuro" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  // Sair vive no menu de conta do rodapé da sidebar, não mais no topbar.
  await page.getByRole("button", { name: email }).click();
  // Escopo no menu: /settings tem a própria seção "Conta" com outro "Sair".
  await page.getByRole("menu").getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login/);

  await signIn(page, email);
  await expect(page).toHaveURL(/\/library/);
  await expect(page.locator("html")).toHaveClass(/dark/);
});
