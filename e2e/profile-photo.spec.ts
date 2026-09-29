import sharp from "sharp";
import { test, expect } from "@playwright/test";

import { signIn } from "./helpers";

/**
 * 900x600, não quadrada de propósito: prova o recorte central no
 * `createImageBitmap`/canvas real do Chromium, não um mock de
 * `toAvatarUpload` como no teste de componente.
 */
async function nonSquarePhoto(): Promise<Buffer> {
  return sharp({
    create: {
      width: 900,
      height: 600,
      channels: 3,
      background: { r: 200, g: 120, b: 40 },
    },
  })
    .png()
    .toBuffer();
}

test("enviar, ver na sidebar, remover e voltar às iniciais", async ({
  page,
}) => {
  const email = `e2e-avatar-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  await page.goto("/settings");

  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Enviar foto" }).click(),
  ]);
  await chooser.setFiles({
    name: "foto.png",
    mimeType: "image/png",
    buffer: await nonSquarePhoto(),
  });

  await expect(page.getByText("Foto atualizada.")).toBeVisible();
  // O botão fica desabilitado durante o envio; o foco volta para ele depois.
  await expect(
    page.getByRole("button", { name: "Alterar foto" }),
  ).toBeFocused();

  const sidebarAvatar = page
    .getByRole("button", { name: email })
    .locator("img");
  await expect(sidebarAvatar).toHaveAttribute("src", /^\/api\/avatar\?v=/);
  await expect
    .poll(() =>
      sidebarAvatar.evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0);

  await page.getByRole("button", { name: "Remover foto" }).click();
  await expect(page.getByText("Foto removida.")).toBeVisible();

  await expect(
    page.getByRole("button", { name: email }).locator("img"),
  ).toHaveCount(0);
  // "Remover foto" sumiu com a foto; o foco não fica perdido no body.
  await expect(page.getByRole("button", { name: "Enviar foto" })).toBeFocused();
});

test("arquivo que o browser não decodifica mostra erro de formato", async ({
  page,
}) => {
  const email = `e2e-avatar-error-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  await page.goto("/settings");

  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Enviar foto" }).click(),
  ]);
  await chooser.setFiles({
    name: "nao-e-imagem.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });

  await expect(
    page.getByText("Formato não suportado. Use JPEG, PNG, WebP, GIF ou AVIF."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: email }).locator("img"),
  ).toHaveCount(0);
});
