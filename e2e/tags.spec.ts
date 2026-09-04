import { test, expect } from "@playwright/test";

import { createChildTag, createRootTag, signIn } from "./helpers";

test.describe("Rota /tags/[tagId] e navegação de tags", () => {
  test("navega para a página de detalhe da tag a partir da lista de tags (/tags)", async ({
    page,
  }) => {
    const email = `e2e-tags-detail-${Date.now()}@muvuca.test`;
    await signIn(page, email);
    await expect(page).toHaveURL(/\/library/);

    // Navega para /tags
    await page.goto("/tags");
    await expect(
      page.getByRole("heading", { level: 1, name: "Tags" }),
    ).toBeVisible();

    // Cria uma tag raiz
    const tagName = `Tag Principal ${Date.now()}`;
    await page.getByRole("button", { name: "Criar tag" }).first().click();
    const createDialog = page.getByRole("dialog", { name: "Nova tag" });
    await expect(createDialog).toBeVisible();
    await createDialog.getByLabel("Nome").fill(tagName);
    await createDialog.getByRole("button", { name: "Criar tag" }).click();
    await expect(page.getByText("Tag criada.")).toBeVisible();

    // Clica no link da tag na árvore para abrir o detalhe
    const tagLink = page
      .getByRole("region", { name: "Árvore de tags" })
      .getByRole("link", { name: tagName });
    await expect(tagLink).toBeVisible();
    await tagLink.click();

    // Verifica que a URL é /tags/<uuid> e que a página carrega corretamente
    await expect(page).toHaveURL(/\/tags\/[0-9a-f-]{36}$/);
    await expect(
      page.getByRole("heading", { level: 1, name: tagName }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Seus itens" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Caminho da tag" }),
    ).toBeVisible();
  });

  test("navega para a página de detalhe da tag a partir da barra lateral (TagNavigation)", async ({
    page,
  }) => {
    const email = `e2e-tags-sidebar-${Date.now()}@muvuca.test`;
    await signIn(page, email);
    await expect(page).toHaveURL(/\/library/);

    // Cria uma tag pela página /tags
    await page.goto("/tags");
    const tagName = `Tag Sidebar ${Date.now()}`;
    await page.getByRole("button", { name: "Criar tag" }).first().click();
    const createDialog = page.getByRole("dialog", { name: "Nova tag" });
    await createDialog.getByLabel("Nome").fill(tagName);
    await createDialog.getByRole("button", { name: "Criar tag" }).click();
    await expect(page.getByText("Tag criada.")).toBeVisible();

    // Retorna para a biblioteca
    await page.goto("/library");
    await expect(page).toHaveURL(/\/library/);

    // Clica no link da tag presente na barra lateral de navegação
    const sidebar = page.getByRole("navigation", {
      name: "Navegação principal",
    });
    await expect(sidebar).toBeVisible();
    const sidebarTagLink = sidebar.getByRole("link", { name: tagName });
    await expect(sidebarTagLink).toBeVisible();
    await sidebarTagLink.click();

    // Confirma que abriu a página de detalhe da tag
    await expect(page).toHaveURL(/\/tags\/[0-9a-f-]{36}$/);
    await expect(
      page.getByRole("heading", { level: 1, name: tagName }),
    ).toBeVisible();
  });

  test("navegação por breadcrumb retorna à tag ancestral", async ({ page }) => {
    const email = `e2e-tags-breadcrumb-${Date.now()}@muvuca.test`;
    await signIn(page, email);

    // Criar e editar tags vive em `/tags`; a página de detalhe só mostra o
    // cabeçalho da tag e o rollup de itens.
    const parentName = `Pai ${Date.now()}`;
    const childName = `Filha ${Date.now()}`;
    await createRootTag(page, parentName);
    await createChildTag(page, parentName, childName);

    // Abre a tag filha a partir da árvore de `/tags`
    await page.goto("/tags");
    const childLink = page
      .getByRole("region", { name: "Árvore de tags" })
      .getByRole("link", { name: childName });
    await expect(childLink).toBeVisible();
    await childLink.click();
    await expect(page).toHaveURL(/\/tags\/[0-9a-f-]{36}$/);
    await expect(
      page.getByRole("heading", { level: 1, name: childName }),
    ).toBeVisible();

    // Clica no link do ancestral pai no breadcrumb
    const breadcrumbNav = page.getByRole("navigation", {
      name: "Caminho da tag",
    });
    await expect(breadcrumbNav).toBeVisible();
    await breadcrumbNav.getByRole("link", { name: parentName }).click();

    // Confirma que voltou para o detalhe da tag pai
    await expect(
      page.getByRole("heading", { level: 1, name: parentName }),
    ).toBeVisible();
  });

  test("retorna 404 para tagId inexistente ou inválido", async ({ page }) => {
    const email = `e2e-tags-notfound-${Date.now()}@muvuca.test`;
    await signIn(page, email);

    // Tag com ID que não é UUID
    await page.goto("/tags/not-a-uuid");
    await expect(
      page.getByRole("heading", { level: 1, name: "Página não encontrada" }),
    ).toBeVisible();

    // Tag com UUID inexistente
    await page.goto("/tags/00000000-0000-0000-0000-000000000000");
    await expect(
      page.getByRole("heading", { level: 1, name: "Página não encontrada" }),
    ).toBeVisible();
  });
});

test("cria uma tag raiz e uma tag filha", async ({ page }) => {
  const email = `e2e-tags-create-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  await createRootTag(page, "Trabalho");
  await createChildTag(page, "Trabalho", "Referencias");

  await page.goto("/tags");
  const tree = page.getByRole("region", { name: "Árvore de tags" });

  // A filha existe e o pai passou a ter chevron -- o chevron só é
  // renderizado em nós com filhos, então ele é a prova da hierarquia.
  await expect(tree.getByRole("link", { name: "Trabalho" })).toBeVisible();
  await expect(tree.getByRole("link", { name: "Referencias" })).toBeVisible();
  await expect(
    tree.getByRole("button", { name: "Recolher Trabalho" }),
  ).toBeVisible();

  // O shell também reflete a hierarquia nova (revalidatePath de layout).
  await expect(
    page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Referencias" }),
  ).toBeVisible();
});

test("edita o nome de uma tag", async ({ page }) => {
  const email = `e2e-tags-edit-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  await createRootTag(page, "Rascunho");

  await page.getByRole("button", { name: "Ações da tag Rascunho" }).click();
  await page.getByRole("menuitem", { name: "Editar" }).click();

  const dialog = page.getByRole("dialog", { name: "Editar tag" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Nome").fill("Arquivo");
  await dialog.getByRole("button", { name: "Salvar alterações" }).click();

  await expect(page.getByText("Tag atualizada.")).toBeVisible();
  const tree = page.getByRole("region", { name: "Árvore de tags" });
  await expect(tree.getByRole("link", { name: "Arquivo" })).toBeVisible();
  await expect(tree.getByRole("link", { name: "Rascunho" })).toHaveCount(0);
});

test("excluir uma tag promove as filhas para o nível do pai", async ({
  page,
}) => {
  const email = `e2e-tags-delete-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  await createRootTag(page, "Pai");
  await createChildTag(page, "Pai", "Filha");

  await page.goto("/tags");
  await page.getByRole("button", { name: "Ações da tag Pai" }).click();
  await page.getByRole("menuitem", { name: "Excluir" }).click();

  const alert = page.getByRole("alertdialog");
  await expect(alert).toBeVisible();
  await expect(alert.getByText("Excluir “Pai”?")).toBeVisible();
  await alert.getByRole("button", { name: "Excluir tag" }).click();

  await expect(page.getByText("Tag excluída.")).toBeVisible();

  const tree = page.getByRole("region", { name: "Árvore de tags" });
  await expect(tree.getByRole("link", { name: "Pai" })).toHaveCount(0);
  // A filha sobreviveu e virou raiz: continua na árvore e ninguém tem
  // chevron, porque não há mais nenhum nó com filhos.
  await expect(tree.getByRole("link", { name: "Filha" })).toBeVisible();
  await expect(tree.getByRole("button", { name: /^Recolher / })).toHaveCount(0);
});

test("nome duplicado no mesmo nível mostra erro e mantém o diálogo aberto", async ({
  page,
}) => {
  const email = `e2e-tags-duplicate-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  await createRootTag(page, "Repetida");

  await page.goto("/tags");
  await page.getByRole("button", { name: "Criar tag" }).first().click();

  const dialog = page.getByRole("dialog", { name: "Nova tag" });
  await dialog.getByLabel("Nome").fill("Repetida");
  await dialog.getByRole("button", { name: "Criar tag" }).click();

  await expect(
    dialog.getByRole("alert").filter({
      hasText: "Esse nome já está em uso nesse nível da hierarquia.",
    }),
  ).toBeVisible();
  await expect(dialog).toBeVisible();

  // Nada foi criado: continua existindo uma única "Repetida".
  await page.goto("/tags");
  await expect(
    page.getByRole("region", { name: "Árvore de tags" }).getByRole("link", {
      name: "Repetida",
    }),
  ).toHaveCount(1);
});
