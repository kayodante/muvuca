import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ItemCard } from "./ItemCard";
import type { LibraryItemSummary } from "@/lib/database/queries/items";
import type { Tag } from "@/lib/database/queries/tags";

const { toast } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("sonner", () => ({ toast }));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.clearAllMocks();
});

const mockTags: Tag[] = [
  {
    id: "tag-1",
    name: "React",
    colorToken: "blue",
    description: null,
    parentId: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
];

const mockLink: LibraryItemSummary = {
  id: "item-link-1",
  type: "link",
  title: "Next.js Documentation",
  description: "App router guides and references",
  url: "https://nextjs.org/docs",
  tagIds: ["tag-1"],
  preview: null,
};

const mockPrompt: LibraryItemSummary = {
  id: "item-prompt-1",
  type: "prompt",
  title: "TypeScript Assistant",
  description: "Helpful assistant prompt",
  url: null,
  contentPreview: "You are a senior TypeScript engineer...",
  tagIds: ["tag-1"],
};

const mockCodeComponent: LibraryItemSummary = {
  id: "item-code-1",
  type: "code_component",
  title: "Button Component",
  description: "Accessible button component",
  url: "https://ui.shadcn.com/docs/components/button",
  contentPreview:
    "export function Button({ children }: ButtonProps) {\n  return <button>{children}</button>;\n}",
  tagIds: ["tag-1"],
};

async function renderCard(
  item: LibraryItemSummary,
  tags = mockTags,
  morphing = false,
  onEdit = vi.fn(),
  onDelete = vi.fn(),
  onView = vi.fn(),
  onRefreshPreview = vi.fn(),
) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(
      <ItemCard
        item={item}
        tags={tags}
        morphing={morphing}
        onEdit={onEdit}
        onDelete={onDelete}
        onView={onView}
        onRefreshPreview={onRefreshPreview}
      />,
    );
  });

  return container;
}

describe("ItemCard", () => {
  it("renderiza card de link com hostname e link externo seguro", async () => {
    const dom = await renderCard(mockLink);
    expect(dom.textContent).toContain("Next.js Documentation");
    expect(dom.textContent).toContain("nextjs.org");
    expect(dom.textContent).toContain("link");

    const anchor = dom.querySelector("a");
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute("target")).toBe("_blank");
    expect(anchor?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(anchor?.getAttribute("href")).toBe("https://nextjs.org/docs");

    // The quick action is a real <a> to the same URL, not a button.
    const openAction = dom.querySelector(
      'a[aria-label="Abrir link em nova aba"]',
    );
    expect(openAction).not.toBeNull();
    expect(openAction?.getAttribute("href")).toBe("https://nextjs.org/docs");
    expect(openAction?.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("renderiza card de prompt com preview e botão de visualização completa", async () => {
    const handleView = vi.fn();
    const dom = await renderCard(
      mockPrompt,
      mockTags,
      false,
      vi.fn(),
      vi.fn(),
      handleView,
    );

    expect(dom.textContent).toContain("TypeScript Assistant");
    expect(dom.textContent).toContain("prompt");
    expect(dom.textContent).toContain(
      "You are a senior TypeScript engineer...",
    );

    const viewButton = dom.querySelector(
      'button[aria-label="Ver conteúdo completo"]',
    ) as HTMLButtonElement | null;
    expect(viewButton).not.toBeNull();

    await act(async () => {
      viewButton?.click();
    });

    expect(handleView).toHaveBeenCalledOnce();
  });

  it("copia o prompt com toast de confirmação ao clicar na ação rápida", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const dom = await renderCard(mockPrompt);
    const copyButton = dom.querySelector('button[aria-label="Copiar prompt"]');
    expect(copyButton).not.toBeNull();
    const iconSwap = copyButton?.querySelector(".t-icon-swap");
    expect(iconSwap?.getAttribute("data-state")).toBe("a");

    await act(async () => {
      (copyButton as HTMLButtonElement).click();
    });

    expect(iconSwap?.getAttribute("data-state")).toBe("b");
    expect(writeText).toHaveBeenCalledWith(
      "You are a senior TypeScript engineer...",
    );
    expect(toast.success).toHaveBeenCalledWith(
      "Prompt copiado para a área de transferência.",
    );
  });

  it("exibe toast de erro se falhar ao copiar o prompt", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });

    const dom = await renderCard(mockPrompt);
    const copyButton = dom.querySelector('button[aria-label="Copiar prompt"]');
    expect(copyButton).not.toBeNull();

    await act(async () => {
      (copyButton as HTMLButtonElement).click();
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Não foi possível copiar o prompt.",
    );
  });

  it("copia o link com toast de confirmação ao clicar na ação rápida", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const dom = await renderCard(mockLink);
    const copyButton = dom.querySelector('button[aria-label="Copiar link"]');
    expect(copyButton).not.toBeNull();

    await act(async () => {
      (copyButton as HTMLButtonElement).click();
    });

    expect(writeText).toHaveBeenCalledWith("https://nextjs.org/docs");
    expect(toast.success).toHaveBeenCalledWith(
      "Link copiado para a área de transferência.",
    );
  });

  it("exibe toast de erro se falhar ao copiar o link", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });

    const dom = await renderCard(mockLink);
    const copyButton = dom.querySelector('button[aria-label="Copiar link"]');
    expect(copyButton).not.toBeNull();

    await act(async () => {
      (copyButton as HTMLButtonElement).click();
    });

    expect(toast.error).toHaveBeenCalledWith("Não foi possível copiar o link.");
  });

  it("renderiza tags associadas como links para /tags/[tagId]", async () => {
    const dom = await renderCard(mockLink);
    const tagLink = Array.from(dom.querySelectorAll("a")).find(
      (a) => a.getAttribute("href") === "/tags/tag-1",
    );
    expect(tagLink).not.toBeUndefined();
    expect(tagLink?.textContent).toContain("React");
  });

  it("renderiza card de code_component com badge code, preview monoespaçado e ação de visualização completa", async () => {
    const handleView = vi.fn();
    const dom = await renderCard(
      mockCodeComponent,
      mockTags,
      false,
      vi.fn(),
      vi.fn(),
      handleView,
    );

    expect(dom.textContent).toContain("Button Component");
    expect(dom.textContent).toContain("code");
    expect(dom.textContent).toContain("export function Button");

    const viewButton = dom.querySelector(
      'button[aria-label="Ver código completo"]',
    ) as HTMLButtonElement | null;
    expect(viewButton).not.toBeNull();

    await act(async () => {
      viewButton?.click();
    });

    expect(handleView).toHaveBeenCalledOnce();
  });

  it("copia o código com toast de confirmação ao clicar na ação rápida", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const dom = await renderCard(mockCodeComponent);
    const copyButton = dom.querySelector('button[aria-label="Copiar código"]');
    expect(copyButton).not.toBeNull();

    await act(async () => {
      (copyButton as HTMLButtonElement).click();
    });

    expect(writeText).toHaveBeenCalledWith(mockCodeComponent.contentPreview);
    expect(toast.success).toHaveBeenCalledWith(
      "Código copiado para a área de transferência.",
    );
  });

  it("exibe toast de erro se falhar ao copiar o código", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });

    const dom = await renderCard(mockCodeComponent);
    const copyButton = dom.querySelector('button[aria-label="Copiar código"]');
    expect(copyButton).not.toBeNull();

    await act(async () => {
      (copyButton as HTMLButtonElement).click();
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Não foi possível copiar o código.",
    );
  });

  it("permite copiar link da fonte quando code_component possui URL válida", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const dom = await renderCard(mockCodeComponent);
    const copyLinkButton = dom.querySelector(
      'button[aria-label="Copiar link"]',
    );
    expect(copyLinkButton).not.toBeNull();

    await act(async () => {
      (copyLinkButton as HTMLButtonElement).click();
    });

    expect(writeText).toHaveBeenCalledWith(
      "https://ui.shadcn.com/docs/components/button",
    );
    expect(toast.success).toHaveBeenCalledWith(
      "Link copiado para a área de transferência.",
    );
  });

  it("não renderiza botão de copiar link quando code_component não possui URL", async () => {
    const codeWithoutUrl: LibraryItemSummary = {
      ...mockCodeComponent,
      url: null,
    };
    const dom = await renderCard(codeWithoutUrl);
    const copyLinkButton = dom.querySelector(
      'button[aria-label="Copiar link"]',
    );
    expect(copyLinkButton).toBeNull();
  });

  it("renderiza thumbnail same-origin, decorativa e lazy, quando o preview está pronto com hash", async () => {
    const dom = await renderCard({
      ...mockLink,
      preview: {
        status: "ready",
        thumbnailHash: "abc123",
        thumbnailWidth: 640,
        thumbnailHeight: 360,
        faviconHash: null,
        remoteDescription: null,
        siteName: null,
      },
    });

    const img = dom.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toContain("/api/previews/");
    expect(img?.getAttribute("alt")).toBe("");
    expect(img?.getAttribute("loading")).toBe("lazy");
  });

  it("renderiza bloco de skeleton, sem img, quando o preview está pending", async () => {
    const dom = await renderCard({
      ...mockLink,
      preview: {
        status: "pending",
        thumbnailHash: null,
        thumbnailWidth: null,
        thumbnailHeight: null,
        faviconHash: null,
        remoteDescription: null,
        siteName: null,
      },
    });

    expect(dom.querySelector("img")).toBeNull();
  });

  it("renderiza o monograma do domínio, sem img e sem texto de erro visível, quando o preview falhou", async () => {
    const dom = await renderCard({
      ...mockLink,
      preview: {
        status: "failed",
        thumbnailHash: null,
        thumbnailWidth: null,
        thumbnailHeight: null,
        faviconHash: null,
        remoteDescription: null,
        siteName: null,
      },
    });

    expect(dom.querySelector("img")).toBeNull();
    expect(dom.textContent).not.toMatch(/erro|falh|indispon/i);
  });

  it("troca para o fallback quando a thumbnail dispara onError", async () => {
    const dom = await renderCard({
      ...mockLink,
      preview: {
        status: "ready",
        thumbnailHash: "abc123",
        thumbnailWidth: 640,
        thumbnailHeight: 360,
        faviconHash: null,
        remoteDescription: null,
        siteName: null,
      },
    });

    const img = dom.querySelector("img[aria-hidden='true']");
    await act(async () => {
      img?.dispatchEvent(new Event("error"));
    });

    expect(dom.querySelector("img")).toBeNull();
  });

  it("card de prompt não ganha área de mídia (regressão)", async () => {
    const dom = await renderCard(mockPrompt);
    expect(dom.querySelector('img[aria-hidden="true"]')).toBeNull();
  });

  it("card de code_component não ganha área de mídia (regressão)", async () => {
    const dom = await renderCard(mockCodeComponent);
    expect(dom.querySelector('img[aria-hidden="true"]')).toBeNull();
  });

  it("monograma exibe a letra correta quando não há favicon", async () => {
    const dom = await renderCard(mockLink);
    // mockLink.url is https://nextjs.org/docs -> domain "nextjs.org"
    const monogram = Array.from(dom.querySelectorAll("span")).find(
      (span) => span.textContent === "N",
    );
    expect(monogram).not.toBeUndefined();
  });

  it("item de link com URL inválida continua caindo em 'Link inválido' e sem área de mídia", async () => {
    const dom = await renderCard({ ...mockLink, url: "javascript:alert(1)" });
    expect(dom.textContent).toContain("Link inválido");
    expect(dom.querySelector('a[target="_blank"]')).toBeNull();
    expect(dom.querySelector('img[aria-hidden="true"]')).toBeNull();
  });

  // The actual refreshItemPreview server-action call + toast now live in
  // ItemsPage (see its test suite) -- ItemCard, a presentational
  // component, only needs to invoke whatever callback it was handed.
  it("mostra 'Atualizar prévia' no menu de um item de link e invoca onRefreshPreview", async () => {
    const onRefreshPreview = vi.fn();
    const dom = await renderCard(
      mockLink,
      mockTags,
      false,
      vi.fn(),
      vi.fn(),
      vi.fn(),
      onRefreshPreview,
    );
    const menuButton = Array.from(dom.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes(`Ações de ${mockLink.title}`),
    ) as HTMLButtonElement;
    await act(async () => {
      menuButton.click();
    });

    const refreshItem = Array.from(
      document.body.querySelectorAll('[role="menuitem"]'),
    ).find((el) => el.textContent === "Atualizar prévia");
    expect(refreshItem).not.toBeUndefined();

    await act(async () => {
      (refreshItem as HTMLElement).click();
    });

    expect(onRefreshPreview).toHaveBeenCalledOnce();
  });

  it("não mostra 'Atualizar prévia' no menu de um item de prompt", async () => {
    const dom = await renderCard(mockPrompt);
    const menuButton = Array.from(dom.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes(`Ações de ${mockPrompt.title}`),
    ) as HTMLButtonElement;
    await act(async () => {
      menuButton.click();
    });

    const refreshItem = Array.from(
      document.body.querySelectorAll('[role="menuitem"]'),
    ).find((el) => el.textContent === "Atualizar prévia");
    expect(refreshItem).toBeUndefined();
  });

  it("não mostra 'Atualizar prévia' no menu de um item de code_component", async () => {
    const dom = await renderCard(mockCodeComponent);
    const menuButton = Array.from(dom.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes(`Ações de ${mockCodeComponent.title}`),
    ) as HTMLButtonElement;
    await act(async () => {
      menuButton.click();
    });

    const refreshItem = Array.from(
      document.body.querySelectorAll('[role="menuitem"]'),
    ).find((el) => el.textContent === "Atualizar prévia");
    expect(refreshItem).toBeUndefined();
  });
});
