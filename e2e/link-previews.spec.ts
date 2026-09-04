import path from "node:path";

import { test, expect } from "@playwright/test";

import { signIn } from "./helpers";

/**
 * The `webServer` runs `pnpm start` (production) and the SSRF guard blocks
 * `127.0.0.1`, so there is no way to serve a local fixture page to the
 * fetcher, and CI must not depend on internet access. Every scenario below
 * is chosen to need zero external network -- no environment escape hatch is
 * added to the SSRF guard to work around this; that guard has no bypass,
 * ever, including in tests.
 *
 * `https://muvuca-e2e.invalid/...` is the vehicle for most scenarios below:
 * `.invalid` is reserved by RFC 2606 to never resolve, so the DNS lookup
 * inside `lib/metadata/` fails deterministically without any real egress
 * succeeding or failing by luck.
 *
 * One scenario ("nada pendente") deliberately uses `http://127.0.0.1/...`
 * instead: `.invalid` only ever produces the *transient* `dns_failure` code
 * (see the scope note below), which keeps the job `pending` through its
 * first two backoff rounds -- the skeleton would never clear, so that
 * scenario would be untestable without it. `127.0.0.1` is rejected
 * synchronously by the SSRF guard (`lib/metadata/ssrf.ts`) with the
 * *permanent* code `blocked_private_ip`, before any connection is
 * attempted -- still zero egress, but a terminal state on the first round.
 *
 * Deliberate scope note: `dns_failure` is a *transient* error code
 * (`lib/metadata/errors.ts` `isPermanent()` returns false for it), and
 * `complete_preview_job`'s retry policy (`0023_link_previews.sql`) keeps a
 * transient failure's `status` at `'pending'` for the first two attempts
 * (+15min, then +2h backoff) -- it only becomes `'failed'` on the 3rd. That
 * backoff makes reaching the literal "failed -> monogram" state
 * unreachable in E2E real time without manipulating the database directly
 * (out of scope, and arguably its own SSRF-adjacent shortcut). Scenarios 2
 * and 3 below assert only what's true regardless of which of those two
 * reachable states (pending-skeleton or failed-monogram) the card is in at
 * assertion time: no broken `<img>`, no visible error copy, domain still
 * shown, and the link stays fully usable -- the card has to look good even
 * with no image, which is exactly what this feature promises, without
 * asserting a specific internal sub-state that timing can't guarantee
 * inside a test run.
 */

async function createLinkItem(
  page: import("@playwright/test").Page,
  title: string,
  url: string,
) {
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Criar item" })
    .click();

  const dialog = page.getByRole("dialog", { name: "Novo item" });
  await dialog.getByLabel("Título").fill(title);
  await dialog.getByLabel("URL").fill(url);
  await dialog.getByRole("button", { name: "Criar item" }).click();

  await expect(page.getByText("Item criado.")).toBeVisible();
  await expect(dialog).toBeHidden();
}

test("cria um link e o card aparece imediatamente", async ({ page }) => {
  const email = `e2e-previews-immediate-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  const title = `Preview imediato ${Date.now()}`;
  await createLinkItem(page, title, "https://muvuca-e2e.invalid/immediate");

  // The card is on screen as soon as the item is created -- creating a
  // link never waits on the enrichment pipeline: the preview drain only
  // runs inside `after()`, scheduled after the response is already sent.
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
});

test("o card mostra o fallback quando a metadata falha", async ({ page }) => {
  const email = `e2e-previews-fail-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  // Deliberately avoids the words "falha"/"erro"/"indispon" in the title
  // itself -- the assertion below checks the card's *rendered* text for
  // those words, and a title containing one would make the test lie.
  const title = `Preview sem imagem ${Date.now()}`;
  await createLinkItem(page, title, "https://muvuca-e2e.invalid/x");

  const card = page.getByRole("article").filter({ hasText: title });
  await expect(card).toBeVisible();

  // Domain still renders in the micro-row regardless of preview status.
  await expect(card.getByText("muvuca-e2e.invalid")).toBeVisible();
  // Neither the pending skeleton nor the failed monogram ever render an
  // <img> -- only a "ready" preview with a thumbnail hash does.
  await expect(card.locator("img")).toHaveCount(0);
  // Não mostrar ícone de erro -- ausência de imagem não é uma falha
  // visível ao usuário.
  await expect(card).not.toContainText(/erro|falha|indispon/i);
});

test("o link continua utilizável com metadata falhada", async ({ page }) => {
  const email = `e2e-previews-usable-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  const title = `Preview mas usavel ${Date.now()}`;
  const url = "https://muvuca-e2e.invalid/y";
  await createLinkItem(page, title, url);

  const card = page.getByRole("article").filter({ hasText: title });
  await expect(card).toBeVisible();

  const anchor = card.getByRole("link").first();
  await expect(anchor).toHaveAttribute("href", url);
  await expect(anchor).toHaveAttribute("target", "_blank");
  await expect(anchor).toHaveAttribute("rel", "noopener noreferrer");
});

test("'Atualizar prévia' não quebra o card", async ({ page }) => {
  const email = `e2e-previews-refresh-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  const title = `Preview atualizavel ${Date.now()}`;
  await createLinkItem(page, title, "https://muvuca-e2e.invalid/refresh");

  const card = page.getByRole("article").filter({ hasText: title });
  await expect(card).toBeVisible();

  await card.getByRole("button", { name: `Ações de ${title}` }).click();
  await page.getByRole("menuitem", { name: "Atualizar prévia" }).click();

  await expect(
    page.getByText("Atualização da prévia solicitada."),
  ).toBeVisible();

  // Regression guard: refreshItemPreview() must
  // revalidate /library so the card actually re-enters the pending state
  // (skeleton) instead of the toast firing while the job silently sits
  // queued until a hard reload. The skeleton's animation class carries a
  // `motion-safe:` variant prefix (`motion-safe:animate-pulse`), so this
  // has to be a substring attribute match, not a `.animate-pulse` class
  // selector -- the literal class token never matches that alone.
  await expect(card.locator('[class*="animate-pulse"]')).toBeVisible();

  // The card is still intact -- title, domain, and open-link affordance
  // all still render after the manual refresh round-trip.
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(card.getByText("muvuca-e2e.invalid")).toBeVisible();
});

test("'Atualizar pré-visualizações' numa página sem pendência mostra o toast de nada pendente", async ({
  page,
}) => {
  const email = `e2e-previews-nothing-pending-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  // http://127.0.0.1/... is rejected synchronously by the SSRF guard
  // (lib/metadata/ssrf.ts) with the permanent error code
  // `blocked_private_ip`, without ever leaving the machine. That gives a
  // deterministic, zero-egress way to reach "nothing left to reschedule"
  // for this page: request_preview_reschedule_for_items never touches a
  // permanent-error 'failed' row (0024_scoped_preview_queue.sql).
  const title = `Preview sem pendencia ${Date.now()}`;
  await createLinkItem(page, title, "http://127.0.0.1/nothing-pending");

  const card = page.getByRole("article").filter({ hasText: title });
  await expect(card).toBeVisible();

  // Wait for the auto-drain to resolve the job to its permanent failed
  // state (skeleton gone) before touching the toolbar button, so the
  // subsequent click is provably against a page with nothing pending.
  await expect(card.locator('[class*="animate-pulse"]')).toHaveCount(0, {
    timeout: 10_000,
  });
  // Positive proof the job actually completed (not just "never enqueued"):
  // LinkPreviewMedia's permanent-failure fallback carries this title.
  await expect(card.getByTitle("Prévia indisponível")).toBeVisible();

  await page
    .getByRole("button", { name: "Atualizar pré-visualizações" })
    .click();

  await expect(
    page.getByText("Nenhuma prévia pendente nesta página."),
  ).toBeVisible();
});

const BOOKMARKS_FIXTURE = path.join(
  import.meta.dirname,
  "../lib/bookmarks/__fixtures__/valid.html",
);

test("importar favoritos continua funcionando com previews ligados", async ({
  page,
}) => {
  const email = `e2e-previews-import-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  await page.goto("/library");
  await page
    .getByRole("button", { name: "Importar favoritos" })
    .first()
    .click();

  const dialog = page.getByRole("dialog", { name: "Importar favoritos" });
  await expect(dialog).toBeVisible();

  await dialog.locator('input[type="file"]').setInputFiles(BOOKMARKS_FIXTURE);
  await expect(dialog.getByText("Estrutura proposta")).toBeVisible();
  await dialog.getByRole("button", { name: "Confirmar importação" }).click();

  await expect(page.getByText("Favoritos importados.")).toBeVisible();
  // The completion screen tells the user previews load in the background
  // instead of blocking the import.
  await expect(
    dialog.getByText(
      "As prévias de link (miniatura, favicon, título e descrição remotos) carregam em segundo plano.",
    ),
  ).toBeVisible();

  await dialog.getByRole("button", { name: "Concluir" }).click();
  await expect(dialog).toBeHidden();

  await page.goto("/library");
  await expect(
    page.getByRole("heading", { name: "Documentação" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Muvuca" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Link na raiz" }),
  ).toBeVisible();
});
