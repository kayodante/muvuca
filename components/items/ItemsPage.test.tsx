import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LibraryItemSummary } from "@/lib/database/queries/items";

const {
  replaceMock,
  searchParamsState,
  routerMock,
  getItemDetailsMock,
  reschedulePreviewsForItemsMock,
  refreshItemPreviewMock,
  notifyPreviewQueueChangedMock,
  toast,
} = vi.hoisted(() => {
  const replace = vi.fn();
  const refresh = vi.fn();
  return {
    replaceMock: replace,
    // `useRouter()` is stable across renders in the App Router; a fresh
    // object per call would re-fire every effect depending on it.
    routerMock: { replace, push: vi.fn(), refresh },
    searchParamsState: { current: new URLSearchParams() },
    getItemDetailsMock: vi.fn(),
    reschedulePreviewsForItemsMock: vi.fn(),
    refreshItemPreviewMock: vi.fn(),
    notifyPreviewQueueChangedMock: vi.fn(),
    // `toast` is called bare for the "nothing was pending" feedback, so the
    // mock has to be callable, not just an object of variants.
    toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
  };
});

vi.mock("sonner", () => ({ toast }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/library",
  useRouter: () => routerMock,
  useSearchParams: () => searchParamsState.current,
}));

vi.mock("@/lib/actions/items", () => ({
  getItemDetails: getItemDetailsMock,
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
}));

vi.mock("@/lib/actions/previews", () => ({
  reschedulePreviewsForItems: reschedulePreviewsForItemsMock,
  refreshItemPreview: refreshItemPreviewMock,
}));

vi.mock("@/lib/events/preview-queue", () => ({
  notifyPreviewQueueChanged: notifyPreviewQueueChangedMock,
  subscribePreviewQueueChanged: vi.fn(() => () => {}),
}));

const { ItemsPage } = await import("@/components/items/ItemsPage");

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let fetchMock: ReturnType<typeof vi.fn>;

/** `usePreviewDrain` now reaches the drain queue via `fetch()` (a Route
 * Handler, not a Server Action -- see the hook's header comment). Every
 * call here resolves the same "nothing to do" shape: scoped phase reports
 * `remaining: 0` (moves the session to the global phase), and the global
 * phase's own first round reports `processed: 0` (its own stop guard), so
 * a default-mocked test session always settles after exactly 2 calls. */
function stubEmptyDrainFetch() {
  fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      ok: true,
      data: { processed: 0, ready: 0, failed: 0, remaining: 0 },
    }),
  } as Response);
  vi.stubGlobal("fetch", fetchMock);
}

beforeEach(() => {
  stubEmptyDrainFetch();
  reschedulePreviewsForItemsMock.mockResolvedValue({
    ok: true,
    data: { rescheduled: 1 },
  });
  refreshItemPreviewMock.mockResolvedValue({ ok: true, data: null });
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  searchParamsState.current = new URLSearchParams();
});

const sampleItems: LibraryItemSummary[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    type: "link",
    title: "Item 1",
    description: "Description 1",
    url: "https://example.com/1",
    tagIds: [],
    preview: null,
  },
];

async function renderItemsPage(
  props: {
    items?: LibraryItemSummary[];
    prevCursor?: string | null;
    nextCursor?: string | null;
  } = {},
) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <ItemsPage
        items={props.items ?? []}
        tags={[]}
        prevCursor={props.prevCursor}
        nextCursor={props.nextCursor}
      />,
    );
  });
}

describe("ItemsPage ?create=1", () => {
  it("opens the create dialog and clears the param from the URL", async () => {
    searchParamsState.current = new URLSearchParams("create=1");

    await renderItemsPage();

    expect(
      document.body.querySelector('[data-slot="dialog-content"]'),
    ).not.toBeNull();
    expect(replaceMock).toHaveBeenCalledWith("/library", { scroll: false });
  });
});

describe("ItemsPage bidirectional pagination", () => {
  it("does not render pagination nav when there is only one page (no prev or next cursor)", async () => {
    await renderItemsPage({
      items: sampleItems,
      prevCursor: null,
      nextCursor: null,
    });

    const nav = container?.querySelector('nav[aria-label="Paginação"]');
    expect(nav).toBeNull();
  });

  it("renders disabled prev button and active next link on page 1", async () => {
    await renderItemsPage({
      items: sampleItems,
      prevCursor: null,
      nextCursor: "next_cursor_page_2",
    });

    const nav = container?.querySelector('nav[aria-label="Paginação"]');
    expect(nav).not.toBeNull();

    const buttons = nav?.querySelectorAll("button, a");
    expect(buttons).toHaveLength(2);

    // Prev button should be disabled button (not a link)
    const prevControl = buttons?.[0];
    expect(prevControl?.tagName.toLowerCase()).toBe("button");
    expect(prevControl?.hasAttribute("disabled")).toBe(true);
    expect(prevControl?.textContent).toContain("Página anterior");

    // Next button should be a link
    const nextControl = buttons?.[1];
    expect(nextControl?.tagName.toLowerCase()).toBe("a");
    expect(nextControl?.getAttribute("href")).toBe(
      "/library?cursor=next_cursor_page_2",
    );
    expect(nextControl?.textContent).toContain("Próxima página");
  });

  it("renders active prev link and active next link on middle pages", async () => {
    searchParamsState.current = new URLSearchParams(
      "cursor=middle_cursor&sort=title_asc",
    );

    await renderItemsPage({
      items: sampleItems,
      prevCursor: "prev_cursor_page_1",
      nextCursor: "next_cursor_page_3",
    });

    const nav = container?.querySelector('nav[aria-label="Paginação"]');
    expect(nav).not.toBeNull();

    const links = nav?.querySelectorAll("a");
    expect(links).toHaveLength(2);

    expect(links?.[0]?.getAttribute("href")).toBe(
      "/library?cursor=prev_cursor_page_1&sort=title_asc",
    );
    expect(links?.[0]?.textContent).toContain("Página anterior");

    expect(links?.[1]?.getAttribute("href")).toBe(
      "/library?cursor=next_cursor_page_3&sort=title_asc",
    );
    expect(links?.[1]?.textContent).toContain("Próxima página");
  });

  it("renders active prev link and disabled next button on last page", async () => {
    searchParamsState.current = new URLSearchParams("cursor=last_page_cursor");

    await renderItemsPage({
      items: sampleItems,
      prevCursor: "prev_cursor_page_2",
      nextCursor: null,
    });

    const nav = container?.querySelector('nav[aria-label="Paginação"]');
    expect(nav).not.toBeNull();

    const buttons = nav?.querySelectorAll("button, a");
    expect(buttons).toHaveLength(2);

    // Prev control should be a link
    const prevControl = buttons?.[0];
    expect(prevControl?.tagName.toLowerCase()).toBe("a");
    expect(prevControl?.getAttribute("href")).toBe(
      "/library?cursor=prev_cursor_page_2",
    );

    // Next control should be a disabled button
    const nextControl = buttons?.[1];
    expect(nextControl?.tagName.toLowerCase()).toBe("button");
    expect(nextControl?.hasAttribute("disabled")).toBe(true);
    expect(nextControl?.textContent).toContain("Próxima página");
  });
});

describe("ItemsPage contextual EmptyState", () => {
  it("renders 'Criar item' and 'Importar favoritos' when collection is empty without filters", async () => {
    await renderItemsPage({ items: [] });

    expect(container?.textContent).toContain("Sua biblioteca está vazia");
    expect(container?.textContent).toContain("Criar item");
    expect(container?.textContent).toContain("Importar favoritos");
  });

  it("renders 'Limpar filtros' action when search query yields 0 results", async () => {
    searchParamsState.current = new URLSearchParams("q=nonexistent");

    await renderItemsPage({ items: [] });

    expect(container?.textContent).toContain("Nenhum resultado");

    const emptyState = container?.querySelector('[class*="border-dashed"]');
    expect(emptyState?.textContent).not.toContain("Importar favoritos");
    expect(emptyState?.textContent).toContain("Limpar filtros");

    const clearButton = Array.from(
      emptyState?.querySelectorAll("button") ?? [],
    ).find((btn) => btn.textContent?.includes("Limpar filtros"));
    expect(clearButton).not.toBeUndefined();

    await act(async () => {
      clearButton?.click();
    });

    expect(replaceMock).toHaveBeenCalledWith("/library", { scroll: false });
  });
});

describe("ItemsPage code_component view detail", () => {
  it("opens the detail dialog when clicking 'Ver código completo' on a code component", async () => {
    const codeItemSummary: LibraryItemSummary = {
      id: "22222222-2222-4222-8222-222222222222",
      type: "code_component",
      title: "Hero Component",
      description: "Hero with call to action",
      url: "https://example.com/hero",
      contentPreview: "export function Hero() { ... }",
      tagIds: [],
    };

    getItemDetailsMock.mockResolvedValueOnce({
      ok: true,
      data: {
        id: "22222222-2222-4222-8222-222222222222",
        type: "code_component",
        title: "Hero Component",
        description: "Hero with call to action",
        url: "https://example.com/hero",
        content: "export function Hero() { return <header>Hero</header>; }",
        tagIds: [],
      },
    });

    await renderItemsPage({ items: [codeItemSummary] });

    expect(container?.textContent).toContain("Hero Component");
    expect(container?.textContent).toContain("code");

    const viewButton = container?.querySelector(
      'button[aria-label="Ver código completo"]',
    ) as HTMLButtonElement | null;
    expect(viewButton).not.toBeNull();

    await act(async () => {
      viewButton?.click();
    });

    expect(getItemDetailsMock).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
    );
    expect(
      document.body.querySelector('[data-slot="dialog-content"]'),
    ).not.toBeNull();
    expect(document.body.textContent).toContain("export function Hero()");
    expect(document.body.textContent).toContain("Copiar código");
  });
});

describe("ItemsPage preview drain escopado", () => {
  const promptItem: LibraryItemSummary = {
    id: "33333333-3333-4333-8333-333333333333",
    type: "prompt",
    title: "Prompt 1",
    description: "Description 1",
    url: null,
    contentPreview: "Escreva um resumo.",
    tagIds: [],
  };

  // A drenagem agora é escopada nos itens renderizados: uma página sem link
  // não tem o que drenar e não deve custar nenhum round-trip.
  it("não drena nem oferece o botão quando a página não tem item de link", async () => {
    await renderItemsPage({ items: [promptItem] });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(container?.textContent).not.toContain("Atualizar pré-visualizações");
  });

  it("drena apenas os ids de link desta página", async () => {
    await renderItemsPage({ items: [...sampleItems, promptItem] });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/previews/drain",
      expect.objectContaining({
        body: JSON.stringify({ itemIds: [sampleItems[0]!.id] }),
      }),
    );
  });

  it("reagenda as prévias da página ao clicar em 'Atualizar pré-visualizações'", async () => {
    await renderItemsPage({ items: sampleItems });

    const refreshButton = Array.from(
      container?.querySelectorAll("button") ?? [],
    ).find((btn) => btn.textContent?.includes("Atualizar pré-visualizações"));
    expect(refreshButton).not.toBeUndefined();

    await act(async () => {
      refreshButton?.click();
    });

    expect(reschedulePreviewsForItemsMock).toHaveBeenCalledWith([
      sampleItems[0]!.id,
    ]);
    expect(toast.success).toHaveBeenCalledWith("1 prévia será atualizada.");
  });
});

describe("ItemsPage refresh preview", () => {
  it("chama refreshItemPreview e mostra toast de confirmação ao clicar em 'Atualizar prévia'", async () => {
    await renderItemsPage({ items: sampleItems });

    const menuButton = Array.from(
      container?.querySelectorAll("button") ?? [],
    ).find((btn) => btn.textContent?.includes("Ações de Item 1")) as
      HTMLButtonElement | undefined;
    await act(async () => {
      menuButton?.click();
    });

    const refreshItem = Array.from(
      document.body.querySelectorAll('[role="menuitem"]'),
    ).find((el) => el.textContent === "Atualizar prévia");
    expect(refreshItem).not.toBeUndefined();

    await act(async () => {
      (refreshItem as HTMLElement).click();
    });

    expect(refreshItemPreviewMock).toHaveBeenCalledWith(sampleItems[0]!.id);
    expect(toast.success).toHaveBeenCalledWith(
      "Atualização da prévia solicitada.",
    );
    // A successful refresh must wake a drain session that already found
    // the queue empty and stopped looping.
    expect(notifyPreviewQueueChangedMock).toHaveBeenCalled();
  });

  it("mostra toast de erro quando refreshItemPreview falha", async () => {
    refreshItemPreviewMock.mockResolvedValue({
      ok: false,
      code: "NOT_FOUND",
      message: "Preview não encontrado.",
    });

    await renderItemsPage({ items: sampleItems });

    const menuButton = Array.from(
      container?.querySelectorAll("button") ?? [],
    ).find((btn) => btn.textContent?.includes("Ações de Item 1")) as
      HTMLButtonElement | undefined;
    await act(async () => {
      menuButton?.click();
    });

    const refreshItem = Array.from(
      document.body.querySelectorAll('[role="menuitem"]'),
    ).find((el) => el.textContent === "Atualizar prévia");

    await act(async () => {
      (refreshItem as HTMLElement).click();
    });

    expect(toast.error).toHaveBeenCalledWith("Preview não encontrado.");
    expect(notifyPreviewQueueChangedMock).not.toHaveBeenCalled();
  });
});
