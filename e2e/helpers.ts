import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase local + Mailpit instead of real SMTP. No email is ever sent in
 * CI. Login itself no longer sends email (AAA-222 replaced magic link with
 * password), but "forgot password" still emails a recovery link, and this
 * helper fetches it the same way the old magic link was fetched.
 */
const MAILPIT_URL = "http://127.0.0.1:54324";

type MailpitMessage = { ID: string };
type MailpitSearchResult = { messages: MailpitMessage[] };

export async function fetchEmailLink(email: string): Promise<string> {
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
      { timeout: 15_000, message: "waiting for auth email" },
    )
    .toBeGreaterThan(0);

  const latest = messages[0];
  if (!latest) {
    throw new Error("no auth email found");
  }

  const messageRes = await fetch(`${MAILPIT_URL}/api/v1/message/${latest.ID}`);
  const message = (await messageRes.json()) as { HTML: string };

  const match = message.HTML.match(/href="([^"]+)"/);
  const href = match?.[1];
  if (!href) {
    throw new Error("link href not found in email body");
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
/** Senha do usuário do seed -- precisa bater com `supabase/seed.sql`. */
export const SEEDED_PASSWORD = "muvuca-dev-local";
/** Senha usada para toda conta isolada criada por teste via `signIn`. */
export const E2E_PASSWORD = "e2e-test-password";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Autentica com um usuário novo e isolado por teste.
 *
 * O formulário de produção nunca cria conta -- é single-user e sempre passa
 * por um usuário já existente. Cada teste precisa de uma biblioteca vazia e
 * exclusiva, então a conta é provisionada fora do produto, por
 * `auth.signUp` com a chave publicável (nenhuma chave secreta ou service
 * role está envolvida; `enable_signup`/`enable_confirmations` só valem para
 * o stack local, e o cadastro hospedado continua desligado).
 *
 * O caminho real do formulário continua coberto por `signInThroughForm`.
 */
export async function signIn(page: Page, email: string) {
  const { error } = await supabase.auth.signUp({
    email,
    password: E2E_PASSWORD,
  });

  // Some specs sign in with the same email twice on purpose (e.g. logging
  // back in as the same user in a new browser session) -- that's the one
  // signUp error that's expected, not a real failure.
  if (error && error.code !== "user_already_exists") {
    throw new Error(`could not create user ${email}: ${error.message}`);
  }

  await signInThroughForm(page, email, E2E_PASSWORD);
  await page.waitForURL(/\/library/);
}

/** Entra pelo formulário de `/login`, exercendo a Server Action de verdade. */
export async function signInThroughForm(
  page: Page,
  email: string,
  password: string,
) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

/** Cria uma tag raiz pelo inspetor de `/tags`. */
export async function createRootTag(page: Page, name: string) {
  await page.goto("/tags");
  await page.getByRole("button", { name: "Criar tag" }).first().click();

  const inspector = page.getByRole("region", { name: "Nova tag" });
  await expect(inspector).toBeVisible();
  await inspector.getByLabel("Nome").fill(name);
  await inspector.getByRole("button", { name: "Criar tag" }).click();

  await expect(page.getByText("Tag criada.")).toBeVisible();
  await expect(page.getByRole("region", { name })).toBeVisible();
}

/** Seleciona uma tag na árvore de `/tags`, abrindo-a no inspetor. */
export async function selectTag(page: Page, name: string) {
  await page
    .getByRole("region", { name: "Árvore de tags" })
    .getByRole("button", { name, exact: true })
    .click();
  await expect(page.getByRole("region", { name })).toBeVisible();
}

/** Cria uma tag filha pelo "Nova tag filha" do inspetor do pai. */
export async function createChildTag(
  page: Page,
  parentName: string,
  name: string,
) {
  await page.goto("/tags");
  await selectTag(page, parentName);
  await page
    .getByRole("region", { name: parentName })
    .getByRole("button", { name: "Nova tag filha" })
    .click();

  const inspector = page.getByRole("region", { name: "Nova tag" });
  await expect(inspector).toBeVisible();
  await inspector.getByLabel("Nome").fill(name);
  await inspector.getByRole("button", { name: "Criar tag" }).click();

  await expect(page.getByText("Tag criada.")).toBeVisible();
  await expect(page.getByRole("region", { name })).toBeVisible();
}
