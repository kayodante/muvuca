import { test, expect } from "@playwright/test";

import { createChildTag, createRootTag, selectTag, signIn } from "./helpers";

test.describe("Rota /t/[...tagPath] e navegação de tags", () => {
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
    await createRootTag(page, tagName);

    // Seleciona a tag na árvore e abre o detalhe pelo inspetor
    await selectTag(page, tagName);
    await page
      .getByRole("region", { name: tagName })
      .getByRole("link", { name: "Abrir itens" })
      .click();

    // A URL é o caminho amigável, derivado do nome -- nunca o UUID.
    await expect(page).toHaveURL(/\/t\/tag-principal-\d+$/);
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
    const tagName = `Tag Sidebar ${Date.now()}`;
    await createRootTag(page, tagName);

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
    await expect(page).toHaveURL(/\/t\/tag-sidebar-\d+$/);
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

    // Abre a tag filha a partir do inspetor de `/tags`
    await page.goto("/tags");
    await selectTag(page, childName);
    await page
      .getByRole("region", { name: childName })
      .getByRole("link", { name: "Abrir itens" })
      .click();
    await expect(page).toHaveURL(/\/t\/pai-\d+\/filha-\d+$/);
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

  test("URL amigável acompanha a hierarquia, o rename e o link UUID antigo", async ({
    page,
  }) => {
    const email = `e2e-tags-friendly-${Date.now()}@muvuca.test`;
    await signIn(page, email);

    await createRootTag(page, "Design");
    await createChildTag(page, "Design", "Recursos & Assets");
    await createChildTag(page, "Recursos & Assets", "Ícones");

    await page.goto("/tags");
    await selectTag(page, "Ícones");
    await page
      .getByRole("region", { name: "Ícones" })
      .getByRole("link", { name: "Abrir itens" })
      .click();
    await expect(page).toHaveURL(/\/t\/design\/recursos-assets\/icones$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Ícones" }),
    ).toBeVisible();

    const breadcrumb = page.getByRole("navigation", {
      name: "Caminho da tag",
    });
    await expect(
      breadcrumb.getByRole("link", { name: "Design" }),
    ).toHaveAttribute("href", "/t/design");
    await expect(
      breadcrumb.getByRole("link", { name: "Recursos & Assets" }),
    ).toHaveAttribute("href", "/t/design/recursos-assets");

    // Nenhum link expõe o UUID; ele segue só no campo oculto `id` do
    // inspetor, que é o que a Server Action recebe.
    await page.goto("/tags");
    await selectTag(page, "Ícones");
    const inspector = page.getByRole("region", { name: "Ícones" });
    const tagId = await inspector.locator('input[name="id"]').inputValue();
    await inspector.getByLabel("Nome").fill("Iconografia");
    await inspector.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("Tag atualizada.")).toBeVisible();
    // A seleção acompanha o rename: o ?tag= muda para o caminho novo.
    await expect(page).toHaveURL(
      /\/tags\?tag=design%2Frecursos-assets%2Ficonografia$/,
    );

    await page
      .getByRole("region", { name: "Iconografia" })
      .getByRole("link", { name: "Abrir itens" })
      .click();
    await expect(page).toHaveURL(/\/t\/design\/recursos-assets\/iconografia$/);

    // O link antigo por UUID redireciona para o caminho atual da tag, com um
    // 307 de HTTP (não permanente: o slug pode mudar de novo).
    const response = await page.goto(`/tags/${tagId}`);
    const legacyResponse = await response
      ?.request()
      .redirectedFrom()
      ?.response();
    expect(legacyResponse?.status()).toBe(307);
    await expect(page).toHaveURL(/\/t\/design\/recursos-assets\/iconografia$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Iconografia" }),
    ).toBeVisible();

    // Sem histórico de slug: o caminho anterior ao rename deixa de existir.
    await page.goto("/t/design/recursos-assets/icones");
    await expect(
      page.getByRole("heading", { level: 1, name: "Página não encontrada" }),
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

    // Caminho amigável inexistente e caminho malformado
    for (const path of ["/t/nao-existe", "/t/Design", "/t/a/b/c/d/e/f/g"]) {
      await page.goto(path);
      await expect(
        page.getByRole("heading", { level: 1, name: "Página não encontrada" }),
      ).toBeVisible();
    }
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
  await expect(
    tree.getByRole("button", { name: "Trabalho", exact: true }),
  ).toBeVisible();
  await expect(
    tree.getByRole("button", { name: "Referencias", exact: true }),
  ).toBeVisible();
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

  await selectTag(page, "Rascunho");
  const inspector = page.getByRole("region", { name: "Rascunho" });
  await inspector.getByLabel("Nome").fill("Arquivo");
  await inspector.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Tag atualizada.")).toBeVisible();

  const tree = page.getByRole("region", { name: "Árvore de tags" });
  await expect(
    tree.getByRole("button", { name: "Arquivo", exact: true }),
  ).toBeVisible();
  await expect(
    tree.getByRole("button", { name: "Rascunho", exact: true }),
  ).toHaveCount(0);
});

test("excluir uma tag promove as filhas para o nível do pai", async ({
  page,
}) => {
  const email = `e2e-tags-delete-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  await createRootTag(page, "Pai");
  await createChildTag(page, "Pai", "Filha");

  await page.goto("/tags");
  await selectTag(page, "Pai");
  await page.getByRole("button", { name: "Mais ações para Pai" }).click();
  await page.getByRole("menuitem", { name: "Excluir" }).click();

  const alert = page.getByRole("alertdialog");
  await expect(alert).toBeVisible();
  await expect(alert.getByText("Excluir “Pai”?")).toBeVisible();
  await alert.getByRole("button", { name: "Excluir tag" }).click();

  await expect(page.getByText("Tag excluída.")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Nenhuma tag selecionada" }),
  ).toBeVisible();

  const tree = page.getByRole("region", { name: "Árvore de tags" });
  await expect(
    tree.getByRole("button", { name: "Pai", exact: true }),
  ).toHaveCount(0);
  // A filha sobreviveu e virou raiz: continua na árvore e ninguém tem
  // chevron, porque não há mais nenhum nó com filhos.
  await expect(
    tree.getByRole("button", { name: "Filha", exact: true }),
  ).toBeVisible();
  await expect(tree.getByRole("button", { name: /^Recolher / })).toHaveCount(0);
});

test("nome duplicado no mesmo nível mostra erro e mantém o formulário aberto", async ({
  page,
}) => {
  const email = `e2e-tags-duplicate-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  await createRootTag(page, "Repetida");

  await page.goto("/tags");
  await page.getByRole("button", { name: "Criar tag" }).first().click();

  const inspector = page.getByRole("region", { name: "Nova tag" });
  await inspector.getByLabel("Nome").fill("Repetida");
  await inspector.getByRole("button", { name: "Criar tag" }).click();

  await expect(
    inspector.getByRole("alert").filter({
      hasText: "Esse nome já está em uso nesse nível da hierarquia.",
    }),
  ).toBeVisible();
  await expect(inspector).toBeVisible();

  // Nada foi criado: continua existindo uma única "Repetida".
  await page.goto("/tags");
  await expect(
    page.getByRole("region", { name: "Árvore de tags" }).getByRole("button", {
      name: "Repetida",
      exact: true,
    }),
  ).toHaveCount(1);
});

test("deep link ?tag= abre o inspetor e /t leva de volta para editar", async ({
  page,
}) => {
  await signIn(page, `e2e-tags-deeplink-${Date.now()}@muvuca.test`);
  await createRootTag(page, "Leituras");

  await page.goto("/t/leituras");
  await page.getByRole("link", { name: "Editar tag" }).click();
  await expect(page).toHaveURL(/\/tags\?tag=leituras$/);
  await expect(page.getByRole("region", { name: "Leituras" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("region", { name: "Leituras" })).toBeVisible();
});

test("trocar de tag com alterações pendentes pede confirmação", async ({
  page,
}) => {
  await signIn(page, `e2e-tags-dirty-${Date.now()}@muvuca.test`);
  await createRootTag(page, "Uma");
  await createRootTag(page, "Outra");

  await selectTag(page, "Uma");
  await page
    .getByRole("region", { name: "Uma" })
    .getByLabel("Nome")
    .fill("Uma editada");
  await page
    .getByRole("region", { name: "Árvore de tags" })
    .getByRole("button", { name: "Outra", exact: true })
    .click();

  const confirm = page.getByRole("alertdialog", {
    name: "Descartar alterações?",
  });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Descartar" }).click();
  await expect(page.getByRole("region", { name: "Outra" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Outra" })).toBeFocused();
});

test("no celular o inspetor abre num painel lateral", async ({ page }) => {
  await signIn(page, `e2e-tags-mobile-${Date.now()}@muvuca.test`);
  await createRootTag(page, "Bolso");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tags");
  await page
    .getByRole("region", { name: "Árvore de tags" })
    .getByRole("button", { name: "Bolso", exact: true })
    .click();

  const sheet = page.getByRole("dialog", { name: "Bolso" });
  await expect(sheet).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/\/tags$/);
});

test("no celular o Escape com alterações pendentes pede confirmação sem fechar o painel", async ({
  page,
}) => {
  await signIn(page, `e2e-tags-mobile-dirty-${Date.now()}@muvuca.test`);
  await createRootTag(page, "Rascunho móvel");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tags");
  await page
    .getByRole("region", { name: "Árvore de tags" })
    .getByRole("button", { name: "Rascunho móvel", exact: true })
    .click();

  const sheet = page.getByRole("dialog", { name: "Rascunho móvel" });
  await expect(sheet).toBeVisible();

  const nameInput = sheet.getByLabel("Nome");
  await nameInput.fill("Rascunho editado");
  await page.keyboard.press("Escape");

  const confirm = page.getByRole("alertdialog", {
    name: "Descartar alterações?",
  });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Continuar editando" }).click();

  await expect(sheet).toBeVisible();
  await expect(nameInput).toHaveValue("Rascunho editado");
});

test("no celular excluir uma tag fecha o painel e mostra o toast", async ({
  page,
}) => {
  await signIn(page, `e2e-tags-mobile-delete-${Date.now()}@muvuca.test`);
  await createRootTag(page, "Descartável");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tags");
  await page
    .getByRole("region", { name: "Árvore de tags" })
    .getByRole("button", { name: "Descartável", exact: true })
    .click();

  const sheet = page.getByRole("dialog", { name: "Descartável" });
  await expect(sheet).toBeVisible();
  await sheet
    .getByRole("button", { name: "Mais ações para Descartável" })
    .click();
  await page.getByRole("menuitem", { name: "Excluir" }).click();

  const alert = page.getByRole("alertdialog");
  await expect(alert).toBeVisible();
  await alert.getByRole("button", { name: "Excluir tag" }).click();

  await expect(page.getByText("Tag excluída.")).toBeVisible();
  await expect(sheet).toBeHidden();
});

test("o inspetor sticky no desktop cabe sob o topbar com uma árvore longa", async ({
  page,
}) => {
  // Creating 30 tags through the real UI, one at a time, is the slow part
  // of this test -- well past the suite's default 30s budget. Each creation
  // goes through a full `page.goto("/tags")` (same as `createRootTag`
  // elsewhere in this file) rather than reusing the open inspector across
  // iterations: staying on the same client instance races the Server
  // Action's own revalidation against the next click and can leave the
  // create form's own submit unreachable -- a client-state issue on its own,
  // out of scope for this test, which only needs 30 tags to exist.
  test.setTimeout(180_000);
  await signIn(page, `e2e-tags-sticky-${Date.now()}@muvuca.test`);

  for (let i = 1; i <= 30; i += 1) {
    await createRootTag(page, `Overflow ${i.toString().padStart(2, "0")}`);
  }

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/tags");

  // Name-sorted, so "Overflow 25" sits well below the fold of a 30-tag tree.
  await page
    .getByRole("region", { name: "Árvore de tags" })
    .getByRole("button", { name: "Overflow 25", exact: true })
    .click();

  const heading = page.getByRole("heading", { level: 2, name: "Overflow 25" });
  const saveButton = page.getByRole("button", { name: "Salvar alterações" });
  await expect(heading).toBeVisible();

  // Scroll the page roughly to the middle of the tree column, as someone
  // browsing a long list before picking a tag near the bottom would.
  await page.mouse.wheel(0, 600);

  // The sticky aside must offset below the sticky Topbar and scroll within
  // its own bounds -- not spill its lower half (Save, "Abrir itens") off
  // the bottom of the viewport under the AppShell's decorative fade.
  await expect(heading).toBeInViewport();
  await expect(saveButton).toBeInViewport();
});

test("move várias tags de uma vez levando as filhas junto", async ({
  page,
}) => {
  await signIn(page, `e2e-tags-bulk-move-${Date.now()}@muvuca.test`);
  await createRootTag(page, "Destino");
  await createRootTag(page, "Origem");
  await createChildTag(page, "Origem", "Neta");
  await createRootTag(page, "Solta");

  await page.goto("/tags");
  await page.getByRole("button", { name: "Selecionar" }).click();
  const tree = page.getByRole("region", { name: "Árvore de tags" });
  await tree.getByRole("checkbox", { name: "Origem" }).check();
  await tree.getByRole("checkbox", { name: "Neta" }).check();
  await tree.getByRole("checkbox", { name: "Solta" }).check();
  await expect(page.getByText("3 tags selecionadas")).toBeVisible();

  await page.getByRole("button", { name: "Mover para…" }).click();
  const dialog = page.getByRole("dialog", { name: "Mover 3 tags" });
  await expect(
    dialog.getByText("1 tag já vai junto com a tag mãe."),
  ).toBeVisible();
  await dialog.getByRole("combobox", { name: "Destino" }).click();
  await page.getByRole("option", { name: "Destino" }).click();
  await dialog.getByRole("button", { name: "Mover", exact: true }).click();

  await expect(page.getByText("3 tags movidas.")).toBeVisible();
  // Destino > Origem > Neta, Destino > Solta: /t paths prove the shape.
  await page.goto("/t/destino/origem/neta");
  await expect(
    page.getByRole("heading", { level: 1, name: "Neta" }),
  ).toBeVisible();
  await page.goto("/t/destino/solta");
  await expect(
    page.getByRole("heading", { level: 1, name: "Solta" }),
  ).toBeVisible();
});

test("exclui várias tags e a neta sobe para o ancestral que sobrou", async ({
  page,
}) => {
  await signIn(page, `e2e-tags-bulk-delete-${Date.now()}@muvuca.test`);
  await createRootTag(page, "Raiz");
  await createChildTag(page, "Raiz", "Meio");
  await createChildTag(page, "Meio", "Baixo");
  await createChildTag(page, "Baixo", "Fundo");

  await page.goto("/tags");
  await page.getByRole("button", { name: "Selecionar" }).click();
  const tree = page.getByRole("region", { name: "Árvore de tags" });
  await tree.getByRole("checkbox", { name: "Meio" }).check();
  await tree.getByRole("checkbox", { name: "Baixo" }).check();

  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  const alert = page.getByRole("alertdialog", { name: "Excluir 2 tags?" });
  await alert.getByRole("button", { name: "Excluir tags" }).click();

  await expect(page.getByText("2 tags excluídas.")).toBeVisible();
  await page.goto("/t/raiz/fundo");
  await expect(
    page.getByRole("heading", { level: 1, name: "Fundo" }),
  ).toBeVisible();
});
