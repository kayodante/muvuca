import { test, expect } from "@playwright/test";

import { createUser, E2E_PASSWORD, fetchEmailLink, signIn } from "./helpers";

const SUCCESS_MESSAGE =
  "Se esse email tiver uma conta, enviamos um link para redefinir a senha.";

test("full password-reset flow: request, mismatch, reset, old password fails, new one works", async ({
  page,
}) => {
  const email = `e2e-password-reset-${Date.now()}@muvuca.test`;
  await createUser(email);

  await page.goto("/login");
  await page.getByRole("link", { name: "Esqueci a senha" }).click();
  await expect(page).toHaveURL(/\/forgot-password/);

  await page.getByLabel("Email").fill(email);
  await page
    .getByRole("button", { name: "Enviar link de redefinição" })
    .click();
  await expect(page.getByRole("status")).toContainText(SUCCESS_MESSAGE);

  const link = await fetchEmailLink(email);
  await page.goto(link);
  await expect(page).toHaveURL(/\/reset-password/);

  const newPassword = "brand-new-password-123";
  await page.getByLabel("Nova senha", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirmar nova senha").fill("does-not-match-1234");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page.getByText("As senhas não coincidem.")).toBeVisible();
  await expect(page).toHaveURL(/\/reset-password/);

  // React 19 resets the form's uncontrolled inputs after the action runs
  // (see LoginForm's identical note on `email`), so both fields need
  // refilling here, not just the one that was wrong.
  await page.getByLabel("Nova senha", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirmar nova senha").fill(newPassword);
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.getByRole("button", { name: email }).click();
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Email ou senha inválidos.")).toBeVisible();

  await page.getByLabel("Senha").fill(newPassword);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/library/);
});

test("unknown email on /forgot-password shows the identical success state", async ({
  page,
}) => {
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill("no-such-account@muvuca.test");
  await page
    .getByRole("button", { name: "Enviar link de redefinição" })
    .click();
  await expect(page.getByRole("status")).toContainText(SUCCESS_MESSAGE);
});

test("a normal password-login session visiting /reset-password never sees the reset form", async ({
  page,
}) => {
  const email = `e2e-reset-guard-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  await page.goto("/reset-password");
  await expect(page).not.toHaveURL(/\/reset-password/);
  await expect(
    page.getByRole("heading", { name: "Defina sua nova senha" }),
  ).not.toBeVisible();
});

test("/reset-password unauthenticated redirects instead of showing the form", async ({
  page,
}) => {
  await page.goto("/reset-password");
  await expect(page).not.toHaveURL(/\/reset-password/);
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("heading", { name: "Defina sua nova senha" }),
  ).not.toBeVisible();
});
