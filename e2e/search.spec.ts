import { test, expect, type Page } from "@playwright/test";

import { createChildTag, createRootTag, signIn } from "./helpers";

/**
 * Cria um item pelo botão do topbar. Local a este spec: os outros specs
 * criam itens com formas diferentes (prompt, com tags, sem tags) e um
 * helper compartilhado teria que crescer parâmetros para cada variação.
 */
async function createItem(
  page: Page,
  options: {
    title: string;
    type?: "link" | "prompt" | "code_component";
    url?: string;
    content?: string;
    tags?: string[];
  },
) {
  await page.goto("/library");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Criar item" })
    .click();

  const dialog = page.getByRole("dialog", { name: "Novo item" });
  await expect(dialog).toBeVisible();

  if (options.type === "code_component") {
    await dialog.getByRole("radio", { name: "Componente de código" }).check();
    await dialog.getByLabel("Título").fill(options.title);
    if (options.content) {
      await dialog.getByLabel("Código", { exact: true }).fill(options.content);
    }
    if (options.url) {
      await dialog.getByLabel("Link da fonte (opcional)").fill(options.url);
    }
  } else if (options.type === "prompt" || options.content) {
    await dialog.getByRole("radio", { name: "Prompt" }).check();
    await dialog.getByLabel("Título").fill(options.title);
    await dialog.getByLabel("Conteúdo").fill(options.content ?? "");
  } else {
    await dialog.getByLabel("Título").fill(options.title);
    await dialog.getByLabel("URL").fill(options.url ?? "https://exemplo.com");
  }

  if (options.tags?.length) {
    await dialog.getByRole("combobox", { name: "Tags (opcional)" }).click();
    const listbox = dialog.getByRole("listbox", { name: "Tags disponíveis" });
    for (const tag of options.tags) {
      await listbox.getByRole("option", { name: tag }).click();
    }
    await dialog.getByRole("combobox", { name: "Tags (opcional)" }).click();
  }

  await dialog.getByRole("button", { name: "Criar item" }).click();
  await expect(page.getByText("Item criado.")).toBeVisible();
  await expect(dialog).toBeHidden();
}

/** Abre `/t/<caminho>` pelo link da tag na barra lateral. */
async function openTagFromSidebar(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name, exact: true })
    .click();

  await expect(page).toHaveURL(/\/t\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/);
}

/** Estado compartilhado pelos testes deste arquivo, montado pela interface. */
async function seedLibrary(page: Page) {
  await createRootTag(page, "Trabalho");
  await createChildTag(page, "Trabalho", "Referencias");

  await createItem(page, {
    title: "Zebra listrada",
    url: "https://exemplo.com/zebra",
    tags: ["Referencias"],
  });
  await createItem(page, {
    title: "Girafa alta",
    content: "Escreva um resumo sobre girafas.",
    tags: ["Trabalho"],
  });
  await createItem(page, {
    title: "Tucano colorido",
    url: "https://exemplo.com/tucano",
  });
  await createItem(page, {
    title: "Acordeao animado",
    type: "code_component",
    content:
      'export function Accordion() { return <details className="animate-accordion" />; }',
    url: "https://exemplo.com/acordeao",
    tags: ["Trabalho"],
  });
}

test("pesquisa por texto filtra a biblioteca", async ({ page }) => {
  const email = `e2e-search-${Date.now()}@muvuca.test`;
  await signIn(page, email);
  await seedLibrary(page);

  await page.goto("/library");
  await page
    .getByRole("searchbox", { name: "Buscar na biblioteca" })
    .fill("Zebra");

  // Debounce de 250ms + router.replace: espera-se a URL, não um sleep.
  await expect(page).toHaveURL(/[?&]q=Zebra/);

  await expect(
    page.getByRole("heading", { name: "Zebra listrada" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Girafa alta" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("heading", { name: "Tucano colorido" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Acordeao animado" }),
  ).toHaveCount(0);

  // Busca por termo no código do componente
  await page
    .getByRole("searchbox", { name: "Buscar na biblioteca" })
    .fill("Accordion");
  await expect(page).toHaveURL(/[?&]q=Accordion/);
  await expect(
    page.getByRole("heading", { name: "Acordeao animado" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Zebra listrada" }),
  ).toHaveCount(0);

  // Busca sem resultado tem estado próprio, não a biblioteca vazia.
  await page
    .getByRole("searchbox", { name: "Buscar na biblioteca" })
    .fill("Ornitorrinco");
  await expect(page.getByText("Nenhum resultado")).toBeVisible();

  await page.getByRole("button", { name: "Limpar busca" }).click();
  await expect(
    page.getByRole("heading", { name: "Zebra listrada" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Acordeao animado" }),
  ).toBeVisible();
});

test("filtro por tipo pelas tabs da barra de filtros", async ({ page }) => {
  const email = `e2e-search-type-${Date.now()}@muvuca.test`;
  await signIn(page, email);
  await seedLibrary(page);

  await page.goto("/library");
  const typeTabs = page
    .getByRole("region", { name: "Filtros e ordenação" })
    .getByRole("group", { name: "Filtrar por tipo" });

  await typeTabs.getByRole("button", { name: "Prompt", exact: true }).click();

  await expect(page).toHaveURL(/[?&]type=prompt/);
  await expect(
    typeTabs.getByRole("button", { name: "Prompt", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { name: "Girafa alta" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Zebra listrada" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Acordeao animado" }),
  ).toHaveCount(0);

  // Filtra por Code (code_component)
  await typeTabs.getByRole("button", { name: "Code", exact: true }).click();

  await expect(page).toHaveURL(/[?&]type=code_component/);
  await expect(
    page.getByRole("heading", { name: "Acordeao animado" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Girafa alta" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("heading", { name: "Zebra listrada" }),
  ).toHaveCount(0);

  // "Tudo" é a única forma de limpar o filtro de tipo: a barra não tem mais
  // "Limpar filtros" (isso vive no estado vazio, quando a busca não retorna
  // nada).
  await typeTabs.getByRole("button", { name: "Tudo", exact: true }).click();
  await expect(page).not.toHaveURL(/[?&]type=/);
  await expect(
    page.getByRole("heading", { name: "Zebra listrada" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Girafa alta" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Tucano colorido" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Acordeao animado" }),
  ).toBeVisible();
});

test("filtro e ordenação mostram o estado otimista enquanto o RSC espera", async ({
  page,
}) => {
  const email = `e2e-search-pending-${Date.now()}@muvuca.test`;
  await signIn(page, email);
  await seedLibrary(page);
  await page.goto("/library");

  async function holdRsc(key: string, value: string) {
    const requested = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    await page.route(
      (url) =>
        url.pathname === "/library" &&
        url.searchParams.has("_rsc") &&
        url.searchParams.get(key) === value,
      async (route) => {
        const response = await route.fetch();
        requested.resolve();
        await release.promise;
        await route.fulfill({ response });
      },
    );
    return { requested: requested.promise, release: release.resolve };
  }

  const toolbar = page.getByRole("region", { name: "Filtros e ordenação" });
  const tabs = toolbar.getByRole("group", { name: "Filtrar por tipo" });
  const results = page.getByTestId("library-results");

  const typeRsc = await holdRsc("type", "prompt");
  const typeClick = tabs
    .getByRole("button", { name: "Prompt", exact: true })
    .click();
  await typeRsc.requested;
  await expect(tabs.getByRole("button", { name: "Prompt" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(tabs.getByRole("button", { name: "Tudo" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(results).toHaveAttribute("aria-busy", "true");
  await expect(results).toHaveClass(/opacity-60/);
  await expect
    .poll(() =>
      results.evaluate((element) => getComputedStyle(element).opacity),
    )
    .toBe("0.6");
  typeRsc.release();
  await typeClick;
  await expect(results).not.toHaveAttribute("aria-busy", "true");
  await expect(
    page.getByRole("heading", { name: "Girafa alta" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Zebra listrada" }),
  ).toHaveCount(0);

  const sortRsc = await holdRsc("sort", "title_asc");
  const sortTrigger = toolbar.getByRole("button", { name: "Ordenar itens" });
  await sortTrigger.click();
  const sortClick = page.getByRole("menuitem", { name: "Título A–Z" }).click();
  await sortRsc.requested;
  await expect(sortTrigger).toContainText("Título A–Z");
  await expect(results).toHaveAttribute("aria-busy", "true");
  sortRsc.release();
  await sortClick;
  await expect(results).not.toHaveAttribute("aria-busy", "true");
});

test("abrir a tag pai traz os itens das tags filhas (rollup)", async ({
  page,
}) => {
  const email = `e2e-search-rollup-${Date.now()}@muvuca.test`;
  await signIn(page, email);
  await seedLibrary(page);

  // O escopo por tag é a barra lateral, não um filtro da barra de filtros:
  // clicar na tag abre `/t/<caminho>`, que roda o mesmo rollup indexado.
  await page.goto("/library");
  await openTagFromSidebar(page, "Trabalho");

  // "Zebra listrada" só tem a tag filha: aparecer aqui é exatamente o rollup.
  await expect(
    page.getByRole("heading", { name: "Zebra listrada" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Girafa alta" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Acordeao animado" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Tucano colorido" }),
  ).toHaveCount(0);
});

test("item com tag pai e filha aparece uma única vez no rollup", async ({
  page,
}) => {
  const email = `e2e-search-dedup-${Date.now()}@muvuca.test`;
  await signIn(page, email);

  await createRootTag(page, "Trabalho");
  await createChildTag(page, "Trabalho", "Referencias");
  await createItem(page, {
    title: "Onca pintada",
    url: "https://exemplo.com/onca",
    tags: ["Trabalho", "Referencias"],
  });

  await page.goto("/library");
  await openTagFromSidebar(page, "Trabalho");

  await expect(page.getByRole("heading", { name: "Onca pintada" })).toHaveCount(
    1,
  );
});
