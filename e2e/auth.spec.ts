import { test, expect } from "@playwright/test";

import {
  SEEDED_EMAIL,
  SEEDED_PASSWORD,
  signIn,
  signInThroughForm,
} from "./helpers";

test("unauthenticated access to a protected route redirects to /login", async ({
  page,
}) => {
  await page.goto("/library");
  await expect(page).toHaveURL(/\/login/);
});

test("authenticated visit to / redirects to /library", async ({ page }) => {
  const email = `e2e-home-redirect-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  await page.goto("/");
  await expect(page).toHaveURL(/\/library/);
});

test("unauthenticated visit to / stays on the landing page", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("prefetch headers cannot bypass protected-route authentication", async ({
  request,
}) => {
  const response = await request.get("/library", {
    headers: {
      "next-router-prefetch": "1",
      purpose: "prefetch",
    },
    maxRedirects: 0,
  });

  expect(response.status()).toBe(307);
  expect(response.headers().location).toMatch(/\/login$/);
  expect(response.headers()["content-security-policy"]).toContain(
    "'strict-dynamic'",
  );
});

// Único teste que passa pelo formulário: os demais provisionam a conta pela
// API (helpers.signIn), porque o produto é single-user e o formulário nunca
// cria conta. Daí o usuário do seed, o único que existe de antemão.
test("full password login and logout", async ({ page }) => {
  await signInThroughForm(page, SEEDED_EMAIL, SEEDED_PASSWORD);

  await expect(page).toHaveURL(/\/library/);
  await expect(page.getByText(SEEDED_EMAIL)).toBeVisible();

  // Sair vive no menu de conta do rodapé da sidebar, não mais no topbar.
  await page.getByRole("button", { name: SEEDED_EMAIL }).click();
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login/);

  // Session is gone: the protected route redirects again.
  await page.goto("/library");
  await expect(page).toHaveURL(/\/login/);
});

test("wrong password shows a generic error and stays on /login", async ({
  page,
}) => {
  await signInThroughForm(page, SEEDED_EMAIL, "not-the-right-password");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Email ou senha inválidos.")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue(SEEDED_EMAIL);
});

test("unknown email shows the same generic error", async ({ page }) => {
  await signInThroughForm(
    page,
    "no-such-account@muvuca.test",
    "whatever-password",
  );

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Email ou senha inválidos.")).toBeVisible();
});

test("invalid callback shows a generic recoverable error", async ({ page }) => {
  await page.goto("/auth/confirm?token_hash=invalid&type=email");
  await expect(page).toHaveURL(/\/login\?error=auth_failed/);
  await expect(
    page.getByText("Não foi possível validar o link"),
  ).toBeVisible();
});

test("open-redirect attempts on the confirm callback are ignored", async ({
  page,
}) => {
  await page.goto(
    "/auth/confirm?token_hash=invalid&type=email&next=https://evil.example",
  );
  await expect(page).toHaveURL(/\/login\?error=auth_failed/);
  await expect(page.url()).not.toContain("evil.example");
});
