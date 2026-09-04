import { expect, test } from "@playwright/test";

test("loads the Geist type families", async ({ page }) => {
  await page.goto("/");

  const typography = await page.evaluate(async () => {
    const metadata = document.createElement("span");
    metadata.className = "text-metadata";
    metadata.textContent = "metadata";
    const brand = document.createElement("span");
    brand.className = "text-brand-pixel";
    brand.textContent = "MUVUCA";
    document.body.append(metadata, brand);
    await document.fonts.ready;

    return {
      families: {
        sans: getComputedStyle(document.body).fontFamily,
        mono: getComputedStyle(metadata).fontFamily,
        pixel: getComputedStyle(brand).fontFamily,
      },
      loaded: [...document.fonts]
        .filter(({ status }) => status === "loaded")
        .map(({ family }) => family),
    };
  });

  expect(typography.families.sans).toContain("Geist");
  expect(typography.families.mono).toContain("Geist Mono");
  expect(typography.families.pixel).toContain("Geist Pixel");
  expect(typography.loaded).toEqual(
    expect.arrayContaining(["Geist", "Geist Mono", "Geist Pixel"]),
  );
});
