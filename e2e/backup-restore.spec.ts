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
});
