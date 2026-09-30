import { test, expect } from "@playwright/test";

import { signIn } from "./helpers";

const backup = {
  version: "1.0",
  exportedAt: "2026-08-16T12:00:00+00:00",
  tags: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Restaurado",
      colorToken: "lime",
      parentId: null,
    },
  ],
  items: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      type: "link",
      title: "Link restaurado",
      url: "https://exemplo-restaurado.test/",
      description: null,
      content: null,
      tagIds: ["11111111-1111-4111-8111-111111111111"],
      createdAt: "2026-08-15T00:00:00+00:00",
    },
    {
      id: "44444444-4444-4444-8444-444444444444",
      type: "prompt",
      title: "Prompt restaurado",
      url: null,
      description: null,
      content: "Conteúdo do prompt restaurado",
      tagIds: [],
      createdAt: "2026-08-14T00:00:00+00:00",
    },
  ],
};

test("restaura um backup JSON pela página de configurações", async ({
  page,
}) => {
  const email = `e2e-backup-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  await page.goto("/settings");
  await page.getByRole("button", { name: "Restaurar backup JSON" }).click();

  const dialog = page.getByRole("dialog", { name: "Restaurar backup" });
  await expect(dialog).toBeVisible();

  await dialog.locator('input[type="file"]').setInputFiles({
    name: "muvuca-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });

  await dialog.getByRole("button", { name: "Confirmar restauração" }).click();

  await expect(dialog.getByText("Itens restaurados")).toBeVisible();
  await dialog.getByRole("button", { name: "Concluir" }).click();

  await page.goto("/library");
  await expect(
    page.getByRole("heading", { name: "Link restaurado" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Prompt restaurado" }),
  ).toBeVisible();

  // Arquivo 1.0 não tem `slug`: o banco deriva do nome na restauração.
  await expect(
    page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Restaurado" }),
  ).toHaveAttribute("href", "/t/restaurado");
});

test("importa um JSON para dentro de uma tag sem duplicar a raiz", async ({
  page,
}) => {
  const email = `e2e-backup-target-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  const design = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const icones = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const base = {
    version: "1.0",
    exportedAt: "2026-08-16T12:00:00+00:00",
  };

  async function upload(
    dialogName: string,
    confirmName: string,
    payload: unknown,
  ) {
    const dialog = page.getByRole("dialog", { name: dialogName });
    await expect(dialog).toBeVisible();
    await dialog.locator('input[type="file"]').setInputFiles({
      name: "muvuca-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(payload)),
    });
    await dialog.getByRole("button", { name: confirmName }).click();
    await expect(
      dialog.getByText(/^Itens (restaurados|importados)$/),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Concluir" }).click();
  }

  // Biblioteca inicial: Design > Ícones.
  await page.goto("/settings");
  await page.getByRole("button", { name: "Restaurar backup JSON" }).click();
  await upload("Restaurar backup", "Confirmar restauração", {
    ...base,
    tags: [
      { id: design, name: "Design", colorToken: "lime", parentId: null },
      { id: icones, name: "Ícones", colorToken: "lime", parentId: design },
    ],
    items: [],
  });

  // Importa para Design: raiz "Ícones" do arquivo funde na subtag existente.
  await page.goto("/t/design");
  await page.getByRole("button", { name: "Mais ações para Design" }).click();
  await page
    .getByRole("menuitem", { name: "Importar itens para esta tag" })
    .click();
  await upload("Importar para Design", "Confirmar importação", {
    ...base,
    tags: [
      {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        name: "Ícones",
        colorToken: "lime",
        parentId: null,
      },
    ],
    items: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        type: "link",
        title: "Link de ícones",
        url: "https://exemplo-icones.test/",
        description: null,
        content: null,
        tagIds: ["cccccccc-cccc-4ccc-8ccc-cccccccccccc"],
        createdAt: "2026-08-15T00:00:00+00:00",
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        type: "prompt",
        title: "Prompt solto",
        url: null,
        description: null,
        content: "Conteúdo do prompt solto",
        tagIds: [],
        createdAt: "2026-08-14T00:00:00+00:00",
      },
    ],
  });

  // Foco volta ao botão de ações depois de fechar o modal.
  await expect(
    page.getByRole("button", { name: "Mais ações para Design" }),
  ).toBeFocused();

  // Prompt sem tag caiu em Design; link ficou em Design > Ícones.
  await page.goto("/t/design");
  await expect(
    page.getByRole("heading", { name: "Prompt solto" }),
  ).toBeVisible();
  await page.goto("/t/design/icones");
  await expect(
    page.getByRole("heading", { name: "Link de ícones" }),
  ).toBeVisible();

  // Não nasceu uma raiz "Ícones" paralela.
  await page.goto("/t/icones");
  await expect(
    page.getByRole("heading", { name: "Página não encontrada" }),
  ).toBeVisible();
});
