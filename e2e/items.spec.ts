import { test, expect } from "@playwright/test";

import { createRootTag, signIn } from "./helpers";

test("header 'Criar item' opens the create dialog while already on /library", async ({
  page,
}) => {
  const email = `e2e-items-${Date.now()}@muvuca.test`;

  await signIn(page, email);
  await expect(page).toHaveURL(/\/library/);

  const headerCreateButton = page
    .getByRole("banner")
    .getByRole("button", { name: "Criar item" });

  await headerCreateButton.click();

  const dialog = page.getByRole("dialog", { name: "Novo item" });
  await expect(dialog).toBeVisible();

  // create=1 must not linger in the URL: otherwise back/refresh reopens it.
  await expect(page).toHaveURL(/^(?!.*create=1).*$/);

  const title = `Item de teste ${Date.now()}`;
  await dialog.getByLabel("Título").fill(title);
  await dialog.getByLabel("URL").fill("https://example.com");
  await dialog.getByRole("button", { name: "Criar item" }).click();

  await expect(page.getByText("Item criado.")).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
});

test("header 'Criar item' still works after cross-route navigation", async ({
  page,
}) => {
  const email = `e2e-items-cross-route-${Date.now()}@muvuca.test`;

  await signIn(page, email);
  await expect(page).toHaveURL(/\/library/);

  await page.goto("/tags");

  await page
    .getByRole("banner")
    .getByRole("button", { name: "Criar item" })
    .click();

  await expect(page).toHaveURL(/\/library/);
  await expect(page.getByRole("dialog", { name: "Novo item" })).toBeVisible();
});

test("cria um prompt e vê o card correspondente", async ({ page }) => {
  const email = `e2e-items-prompt-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  await page
    .getByRole("banner")
    .getByRole("button", { name: "Criar item" })
    .click();

  const dialog = page.getByRole("dialog", { name: "Novo item" });
  await dialog.getByRole("radio", { name: "Prompt" }).check();
  await dialog.getByLabel("Título").fill("Resumo de reuniao");
  await dialog
    .getByLabel("Conteúdo")
    .fill("Resuma a reuniao em cinco topicos objetivos.");
  await dialog.getByRole("button", { name: "Criar item" }).click();

  await expect(page.getByText("Item criado.")).toBeVisible();
  await expect(dialog).toBeHidden();

  const card = page
    .getByRole("article")
    .filter({ hasText: "Resumo de reuniao" });
  await expect(card).toBeVisible();
  await expect(card.getByText("prompt", { exact: true })).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Ver conteúdo completo" }),
  ).toBeVisible();
});

test("associa tags a um item na criação", async ({ page }) => {
  const email = `e2e-items-tags-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  await createRootTag(page, "Estudos");
  await createRootTag(page, "Ferramentas");

  await page.goto("/library");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Criar item" })
    .click();

  const dialog = page.getByRole("dialog", { name: "Novo item" });
  await dialog.getByLabel("Título").fill("Manual de estilo");
  await dialog.getByLabel("URL").fill("https://exemplo.com/manual");

  await dialog.getByRole("combobox", { name: "Tags (opcional)" }).click();
  const listbox = dialog.getByRole("listbox", { name: "Tags disponíveis" });
  await listbox.getByRole("option", { name: "Estudos" }).click();
  await listbox.getByRole("option", { name: "Ferramentas" }).click();

  await expect(
    dialog
      .getByRole("list", { name: "Tags selecionadas" })
      .getByRole("listitem"),
  ).toHaveCount(2);

  await dialog.getByRole("combobox", { name: "Tags (opcional)" }).click();
  await dialog.getByRole("button", { name: "Criar item" }).click();
  await expect(page.getByText("Item criado.")).toBeVisible();

  const card = page
    .getByRole("article")
    .filter({ hasText: "Manual de estilo" });
  await expect(card.getByText("Estudos")).toBeVisible();
  await expect(card.getByText("Ferramentas")).toBeVisible();
});

test("edita o título de um item existente", async ({ page }) => {
  const email = `e2e-items-edit-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  await page
    .getByRole("banner")
    .getByRole("button", { name: "Criar item" })
    .click();
  const createDialog = page.getByRole("dialog", { name: "Novo item" });
  await createDialog.getByLabel("Título").fill("Titulo antigo");
  await createDialog.getByLabel("URL").fill("https://exemplo.com/antigo");
  await createDialog.getByRole("button", { name: "Criar item" }).click();
  await expect(page.getByText("Item criado.")).toBeVisible();

  await page.getByRole("button", { name: "Ações de Titulo antigo" }).click();
  await page.getByRole("menuitem", { name: "Editar" }).click();

  const editDialog = page.getByRole("dialog", { name: "Editar item" });
  await expect(editDialog).toBeVisible();
  await editDialog.getByLabel("Título").fill("Titulo novo");
  await editDialog.getByRole("button", { name: "Salvar alterações" }).click();

  await expect(page.getByText("Item atualizado.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Titulo novo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Titulo antigo" }),
  ).toHaveCount(0);
});

test("exclui um item e volta ao estado vazio", async ({ page }) => {
  const email = `e2e-items-delete-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  await page
    .getByRole("banner")
    .getByRole("button", { name: "Criar item" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Novo item" });
  await dialog.getByLabel("Título").fill("Item descartavel");
  await dialog.getByLabel("URL").fill("https://exemplo.com/descartavel");
  await dialog.getByRole("button", { name: "Criar item" }).click();
  await expect(page.getByText("Item criado.")).toBeVisible();

  await page.getByRole("button", { name: "Ações de Item descartavel" }).click();
  await page.getByRole("menuitem", { name: "Excluir" }).click();

  const alert = page.getByRole("alertdialog");
  await expect(alert.getByText("Excluir “Item descartavel”?")).toBeVisible();
  await alert.getByRole("button", { name: "Excluir item" }).click();

  await expect(page.getByText("Item excluído.")).toHaveCount(1);
  await expect(page.getByText("Item excluído.")).toBeVisible();
  await expect(page.getByText("Sua biblioteca está vazia")).toBeVisible();
});

test("URL fora de http/https é rejeitada no servidor com erro no campo", async ({
  page,
}) => {
  const email = `e2e-items-url-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  await page
    .getByRole("banner")
    .getByRole("button", { name: "Criar item" })
    .click();

  const dialog = page.getByRole("dialog", { name: "Novo item" });
  await dialog.getByLabel("Título").fill("Esquema nao permitido");
  // `ftp://` passes in native `input type="url"` validation and is rejected
  // by Zod on the server: it's the path that proves the boundary validation layer.
  await dialog.getByLabel("URL").fill("ftp://exemplo.com");
  await dialog.getByRole("button", { name: "Criar item" }).click();

  await expect(
    dialog.getByRole("alert").filter({
      hasText: "Informe uma URL http ou https válida.",
    }),
  ).toBeVisible();
  await expect(dialog).toBeVisible();
});

test("cria, visualiza, edita e exclui um componente de código", async ({
  page,
}) => {
  const email = `e2e-items-code-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  await createRootTag(page, "Componentes UI");

  await page.goto("/library");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Criar item" })
    .click();

  const createDialog = page.getByRole("dialog", { name: "Novo item" });
  await createDialog
    .getByRole("radio", { name: "Componente de código" })
    .check();
  await createDialog.getByLabel("Título").fill("Button com Glow");
  await createDialog
    .getByLabel("Código", { exact: true })
    .fill(
      'export function ButtonGlow() { return <button className="glow">Click me</button>; }',
    );
  await createDialog
    .getByLabel("Link da fonte (opcional)")
    .fill("https://exemplo.com/componente");
  await createDialog
    .getByLabel("Descrição (opcional)")
    .fill("Botão estilizado com efeito de brilho.");

  await createDialog.getByRole("combobox", { name: "Tags (opcional)" }).click();
  const listbox = createDialog.getByRole("listbox", {
    name: "Tags disponíveis",
  });
  await listbox.getByRole("option", { name: "Componentes UI" }).click();
  await createDialog.getByRole("combobox", { name: "Tags (opcional)" }).click();

  await createDialog.getByRole("button", { name: "Criar item" }).click();

  await expect(page.getByText("Item criado.")).toBeVisible();
  await expect(createDialog).toBeHidden();

  const card = page.getByRole("article").filter({ hasText: "Button com Glow" });
  await expect(card).toBeVisible();
  await expect(card.getByText("code", { exact: true })).toBeVisible();
  await expect(card.getByText("Componentes UI")).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Ver código completo" }),
  ).toBeVisible();

  // Abre visualização detalhada
  await card.getByRole("button", { name: "Ver código completo" }).click();
  const detailDialog = page.getByRole("dialog");
  await expect(detailDialog).toBeVisible();
  await expect(
    detailDialog.getByRole("heading", { name: "Button com Glow" }),
  ).toBeVisible();
  await expect(
    detailDialog.getByText("export function ButtonGlow()"),
  ).toBeVisible();
  await expect(
    detailDialog.getByRole("link", { name: "Abrir fonte original" }),
  ).toHaveAttribute("href", "https://exemplo.com/componente");

  // Edita o componente a partir do modal de detalhes
  await detailDialog.getByRole("button", { name: "Editar componente" }).click();

  const editDialog = page.getByRole("dialog", { name: "Editar item" });
  await expect(editDialog).toBeVisible();
  await editDialog.getByLabel("Título").fill("Button com Super Glow");
  await editDialog
    .getByLabel("Código", { exact: true })
    .fill(
      'export function ButtonSuperGlow() { return <button className="super-glow">Click me</button>; }',
    );
  await editDialog.getByRole("button", { name: "Salvar alterações" }).click();

  await expect(page.getByText("Item atualizado.")).toBeVisible();
  await expect(editDialog).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Button com Super Glow" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Button com Glow" }),
  ).toHaveCount(0);

  // Exclui o componente
  await page
    .getByRole("button", { name: "Ações de Button com Super Glow" })
    .click();
  await page.getByRole("menuitem", { name: "Excluir" }).click();

  const alert = page.getByRole("alertdialog");
  await expect(
    alert.getByText("Excluir “Button com Super Glow”?"),
  ).toBeVisible();
  await alert.getByRole("button", { name: "Excluir item" }).click();

  await expect(page.getByText("Item excluído.")).toHaveCount(1);
  await expect(page.getByText("Item excluído.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Button com Super Glow" }),
  ).toHaveCount(0);
});
