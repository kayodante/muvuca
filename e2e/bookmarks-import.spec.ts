import path from "node:path";

import { test, expect } from "@playwright/test";

import { signIn } from "./helpers";

test("sidebar opens the bookmark import dialog", async ({ page }) => {
  const email = `e2e-import-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  await page.goto("/tags"); // rota diferente de /library, prova que funciona de qualquer lugar
  await page.getByRole("button", { name: email }).click();
  await page.getByRole("menuitem", { name: "Importar favoritos" }).click();
  // Not `?import=1`: router.replace clears it right after ItemsPage
  // consumes it, so asserting the param would race that clear. The real
  // contract is the dialog opening, asserted below.
  await expect(page).toHaveURL(/\/library/);
  await expect(
    page.getByRole("dialog", { name: "Importar favoritos" }),
  ).toBeVisible();
});

const BOOKMARKS_FIXTURE = path.join(
  import.meta.dirname,
  "../lib/bookmarks/__fixtures__/valid.html",
);

test("importa favoritos de um arquivo HTML e cria itens e tags", async ({
  page,
}) => {
  const email = `e2e-import-full-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  await page.goto("/library");
  await page
    .getByRole("button", { name: "Importar favoritos" })
    .first()
    .click();

  const dialog = page.getByRole("dialog", { name: "Importar favoritos" });
  await expect(dialog).toBeVisible();

  // O input é `sr-only` dentro do label; setInputFiles não precisa de clique.
  await dialog.locator('input[type="file"]').setInputFiles(BOOKMARKS_FIXTURE);

  await expect(dialog.getByText("Estrutura proposta")).toBeVisible();
  await dialog.getByRole("button", { name: "Confirmar importação" }).click();

  await expect(page.getByText("Favoritos importados.")).toBeVisible();
  await dialog.getByRole("button", { name: "Concluir" }).click();
  await expect(dialog).toBeHidden();

  // Os três links da fixture chegaram à biblioteca.
  await page.goto("/library");
  await expect(
    page.getByRole("heading", { name: "Documentação" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Muvuca" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Link na raiz" }),
  ).toBeVisible();

  // As duas pastas viraram tags na navegação lateral.
  const nav = page.getByRole("navigation", { name: "Navegação principal" });
  await expect(nav.getByRole("link", { name: "Trabalho" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Referências" })).toBeVisible();
});

const PREVIEW_DRAIN_FIXTURE = path.join(
  import.meta.dirname,
  "../lib/bookmarks/__fixtures__/preview-drain.html",
);

test("depois de importar, o card sai do esqueleto sem nenhum clique (drenagem automática)", async ({
  page,
}) => {
  const email = `e2e-import-drain-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  await page.goto("/library");
  await page
    .getByRole("button", { name: "Importar favoritos" })
    .first()
    .click();

  const dialog = page.getByRole("dialog", { name: "Importar favoritos" });
  await expect(dialog).toBeVisible();

  // http://127.0.0.1/... never leaves the machine: the SSRF guard in
  // lib/metadata/ssrf.ts rejects it with a deterministic, synchronous
  // `blocked_private_ip` before any connection is attempted (see the
  // docblock atop e2e/link-previews.spec.ts: no CI network dependency, no
  // SSRF escape hatch). That makes the item's preview resolve to a
  // permanent 'failed' state on the very first auto-drain round -- exactly
  // what's needed to prove the card leaves the pending skeleton with zero
  // clicks.
  await dialog
    .locator('input[type="file"]')
    .setInputFiles(PREVIEW_DRAIN_FIXTURE);
  await expect(dialog.getByText("Estrutura proposta")).toBeVisible();
  await dialog.getByRole("button", { name: "Confirmar importação" }).click();

  await expect(page.getByText("Favoritos importados.")).toBeVisible();
  await dialog.getByRole("button", { name: "Concluir" }).click();
  await expect(dialog).toBeHidden();

  // Fresh mount of ItemsPage/usePreviewDrain -- the auto-drain-on-mount
  // session is what's under test here, not a page that was
  // already draining before the import.
  await page.goto("/library");

  const card = page
    .getByRole("article")
    .filter({ hasText: "Preview Drain Item" });
  await expect(card).toBeVisible();

  // No "Atualizar prévia" / "Atualizar pré-visualizações" click anywhere
  // above -- the skeleton must disappear on its own once the auto-drain
  // session claims and completes the job. Generous timeout: this waits on
  // a real Server Action round-trip (claim -> SSRF guard -> complete ->
  // router.refresh), not just a DOM update.
  await expect(card.locator('[class*="animate-pulse"]')).toHaveCount(0, {
    timeout: 10_000,
  });
  // Positive proof the job actually completed (not just "never enqueued"):
  // LinkPreviewMedia's permanent-failure fallback carries this title.
  await expect(card.getByTitle("Prévia indisponível")).toBeVisible();
});
