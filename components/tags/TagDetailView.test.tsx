import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { routerMock, searchParamsState } = vi.hoisted(() => {
  return {
    // `useRouter()` is stable across renders in the App Router; a fresh
    // object per call would re-fire every effect depending on it.
    routerMock: { replace: vi.fn(), push: vi.fn(), refresh: vi.fn() },
    searchParamsState: { current: new URLSearchParams() },
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/tags/11111111-1111-4111-8111-111111111111",
  useRouter: () => routerMock,
  useSearchParams: () => searchParamsState.current,
}));

vi.mock("@/lib/actions/previews", () => ({
  refreshItemPreview: vi.fn(),
}));

import { TagDetailView } from "./TagDetailView";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  // TagDetailView renders ItemsPage, whose usePreviewDrain now reaches the
  // drain queue via `fetch()` (a Route Handler, not a Server Action) --
  // without stubbing it, the effect would attempt a real network call in
  // this non-request test environment.
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        data: { processed: 0, ready: 0, failed: 0, remaining: 0 },
      }),
    } as Response),
  );
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
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

describe("TagDetailView", () => {
  const currentTag = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Design Systems",
    description: "Guias de estilo e tokens",
    colorToken: "tag-purple",
    parentId: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };

  const childTag = {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Tokens",
    description: null,
    colorToken: "tag-blue",
    parentId: currentTag.id,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };

  it("renderiza o cabeçalho com nome, descrição e contagens, sem ações de tag", async () => {
    await act(async () => {
      root?.render(
        <TagDetailView
          tag={currentTag}
          flatTags={[currentTag]}
          ancestors={[]}
          items={[]}
          itemsCount={7}
          nextCursor={null}
          prevCursor={null}
        />,
      );
    });

    expect(container?.textContent).toContain("Design Systems");
    expect(container?.textContent).toContain("Guias de estilo e tokens");
    expect(container?.textContent).toContain("7");
    expect(container?.textContent).toContain("itens");
    expect(container?.textContent).toContain("0");
    expect(container?.textContent).toContain("subtags");
    expect(container?.textContent).not.toContain("Criar tag filha");
    expect(container?.textContent).not.toContain("Excluir");
    expect(container?.textContent).not.toContain("Tags filhas");
  });

  it("conta as tags filhas diretas no card de subtags", async () => {
    await act(async () => {
      root?.render(
        <TagDetailView
          tag={currentTag}
          flatTags={[currentTag, childTag]}
          ancestors={[]}
          items={[]}
          itemsCount={0}
          nextCursor={null}
          prevCursor={null}
        />,
      );
    });

    const subtagsCard = Array.from(
      container?.querySelectorAll("span") ?? [],
    ).find((el) => el.textContent === "1");
    expect(subtagsCard).not.toBeUndefined();
  });

  it("renderiza a seção de itens abaixo do cabeçalho da tag", async () => {
    await act(async () => {
      root?.render(
        <TagDetailView
          tag={currentTag}
          flatTags={[currentTag]}
          ancestors={[]}
          items={[]}
          itemsCount={0}
          nextCursor={null}
          prevCursor={null}
        />,
      );
    });

    expect(container?.textContent).toContain("Seus itens");
    expect(container?.textContent).toContain("Nenhum item nesta tag");
  });
});
