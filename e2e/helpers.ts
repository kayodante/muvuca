import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { E2E_APP_URL } from "../playwright.config";
import { DEFAULT_REDIRECT } from "../lib/security/redirects";

/**
 * Supabase local + Mailpit instead of real SMTP. No email is ever sent in
 * CI; the magic link is extracted from Mailpit's REST API.
 */
const MAILPIT_URL = "http://127.0.0.1:54324";

type MailpitMessage = { ID: string };
type MailpitSearchResult = { messages: MailpitMessage[] };

export async function fetchMagicLink(email: string): Promise<string> {
  let messages: MailpitMessage[] = [];

  await expect
    .poll(
      async () => {
        const res = await fetch(
          `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
        );
        const body = (await res.json()) as MailpitSearchResult;
        messages = body.messages;
        return messages.length;
      },
      { timeout: 15_000, message: "waiting for magic link email" },
    )
    .toBeGreaterThan(0);

  const latest = messages[0];
  if (!latest) {
    throw new Error("no magic link email found");
  }

  const messageRes = await fetch(`${MAILPIT_URL}/api/v1/message/${latest.ID}`);
  const message = (await messageRes.json()) as { HTML: string };

  const match = message.HTML.match(/href="([^"]+)"/);
  const href = match?.[1];
  if (!href) {
    throw new Error("magic link href not found in email body");
  }

  return href.replace(/&amp;/g, "&");
}

/**
 * Valores públicos do stack local. Ficam aqui como default pelo mesmo
 * motivo que `MAILPIT_URL` acima: o processo do Playwright não carrega
 * `.env.local`, e o CI exporta as duas variáveis no job.
 */
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

/** Único usuário que `supabase/seed.sql` cria a cada `db reset`. */
export const SEEDED_EMAIL = "dev@muvuca.local";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Mesmo `emailRedirectTo` que `lib/actions/auth.ts` monta em produção. */
function magicLinkRedirect(): string {
  const url = new URL("/auth/confirm", E2E_APP_URL);
  url.searchParams.set("next", DEFAULT_REDIRECT);
  return url.toString();
}

/**
 * Autentica com um usuário novo e isolado por teste.
 *
 * O formulário de login **não** serve para isso: o Muvuca é um deploy
 * single-user, `lib/actions/auth.ts` manda `shouldCreateUser: false` e o
 * usuário do seed é um só. Cada teste precisa de uma biblioteca vazia e
 * exclusiva, então a conta é provisionada fora do produto -- pela mesma API
 * de magic link, com `shouldCreateUser: true` e a chave publicável (nenhuma
 * chave secreta ou service role está envolvida).
 *
 * Um único email é pedido por login: pedir dois (um para criar a conta,
 * outro pelo formulário) invalidaria o token do primeiro e ainda consumiria
 * o dobro do `auth.rate_limit.email_sent` do stack local.
 *
 * O caminho real do formulário continua coberto por `signInThroughForm`.
 */
export async function signIn(page: Page, email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: magicLinkRedirect() },
  });

  if (error) {
    throw new Error(
      `could not request magic link for ${email}: ${error.message}`,
    );
  }

  await page.goto(await fetchMagicLink(email));
}

/**
 * Entra pelo formulário de `/login`, exercendo a Server Action de verdade.
 * Só funciona com um usuário que já exista (`SEEDED_EMAIL`), porque a action
 * manda `shouldCreateUser: false`.
 */
export async function signInThroughForm(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Enviar link de acesso" }).click();
  // Orçamento igual ao da espera pelo email abaixo, e pelo mesmo motivo: o
  // submit gera o token e dispara o SMTP. Sozinho leva ~1,2s, mas a suíte
  // roda `fullyParallel` e os workers competem pelo mesmo GoTrue -- com o
  // padrão de 5s o login falha por orçamento, não por defeito.
  await expect(page.getByRole("status")).toBeVisible({ timeout: 15_000 });

  await page.goto(await fetchMagicLink(email));
}

/**
 * Cria uma tag raiz pela interface de `/tags`. O botão do cabeçalho e o do
 * estado vazio compartilham o nome acessível "Criar tag", e o submit do
 * diálogo também -- daí o `.first()` antes de abrir e o escopo no diálogo
 * depois.
 */
export async function createRootTag(page: Page, name: string) {
  await page.goto("/tags");
  await page.getByRole("button", { name: "Criar tag" }).first().click();

  const dialog = page.getByRole("dialog", { name: "Nova tag" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Nome").fill(name);
  await dialog.getByRole("button", { name: "Criar tag" }).click();

  await expect(page.getByText("Tag criada.")).toBeVisible();
  await expect(dialog).toBeHidden();
}

/**
 * Cria uma tag filha pelo menu da linha do pai, que já preenche o parentId.
 * Evita o Select "Tag pai" e evita navegar para `/tags/<id>`.
 */
export async function createChildTag(
  page: Page,
  parentName: string,
  name: string,
) {
  await page.goto("/tags");
  await page
    .getByRole("button", { name: `Ações da tag ${parentName}` })
    .click();
  await page.getByRole("menuitem", { name: "Criar tag filha" }).click();

  const dialog = page.getByRole("dialog", { name: "Nova tag" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Nome").fill(name);
  await dialog.getByRole("button", { name: "Criar tag" }).click();

  await expect(page.getByText("Tag criada.")).toBeVisible();
  await expect(dialog).toBeHidden();
}
