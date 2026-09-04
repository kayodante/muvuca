import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PromptDetailDialog } from "./PromptDetailDialog";
import type { LibraryItem } from "@/lib/database/queries/items";
import type { Tag } from "@/lib/database/queries/tags";

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
    name: "Writing",
    colorToken: "purple",
    description: null,
    parentId: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
];

const mockPrompt: Extract<LibraryItem, { type: "prompt" }> = {
  id: "prompt-1",
  type: "prompt",
  title: "Creative Story Prompt",
  description: "A prompt for generating stories",
  url: null,
  content: "Write a sci-fi novel starting in a retro bistro on Mars.",
  tagIds: ["tag-1"],
};

const mockCodeComponent: Extract<LibraryItem, { type: "code_component" }> = {
  id: "code-1",
  type: "code_component",
  title: "Custom Card Component",
  description: "Card component with hover effects",
  url: "https://ui.shadcn.com/docs/components/card",
  content:
    "export function Card({ children }: CardProps) { return <div className='card'>{children}</div>; }",
  tagIds: ["tag-1"],
};

async function renderDialog(
  item: Extract<LibraryItem, { type: "prompt" | "code_component" }> | null,
  tags = mockTags,
  onOpenChange = vi.fn(),
  onEdit = vi.fn(),
) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(
      <PromptDetailDialog
        item={item}
        tags={tags}
        onOpenChange={onOpenChange}
        onEdit={onEdit}
      />,
    );
  });

  return container;
}

describe("PromptDetailDialog", () => {
  it("não renderiza quando item é null", async () => {
    await renderDialog(null);
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it("renderiza os detalhes do prompt, tags e botões de ação", async () => {
    const handleEdit = vi.fn();
    await renderDialog(mockPrompt, mockTags, vi.fn(), handleEdit);

    expect(document.body.textContent).toContain("Creative Story Prompt");
    expect(document.body.textContent).toContain(
      "A prompt for generating stories",
    );
    expect(document.body.textContent).toContain(
      "Write a sci-fi novel starting in a retro bistro on Mars.",
    );
    expect(document.body.textContent).toContain("Writing");

    const editButton = Array.from(
      document.body.querySelectorAll("button"),
    ).find((btn) => btn.textContent?.includes("Editar prompt"));
    expect(editButton).not.toBeUndefined();

    await act(async () => {
      editButton?.click();
    });

    expect(handleEdit).toHaveBeenCalledWith(mockPrompt);
  });

  it("renderiza os detalhes do code_component com bloco de código, link da fonte e botão de edição", async () => {
    const handleEdit = vi.fn();
    await renderDialog(mockCodeComponent, mockTags, vi.fn(), handleEdit);

    expect(document.body.textContent).toContain("Custom Card Component");
    expect(document.body.textContent).toContain(
      "Card component with hover effects",
    );
    expect(document.body.textContent).toContain("export function Card");
    expect(document.body.textContent).toContain("Writing");

    const sourceLink = document.body.querySelector(
      'a[href="https://ui.shadcn.com/docs/components/card"]',
    );
    expect(sourceLink).not.toBeNull();
    expect(sourceLink?.getAttribute("target")).toBe("_blank");
    expect(sourceLink?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(sourceLink?.textContent).toContain("Abrir fonte original");

    const codeElement = document.body.querySelector("pre code");
    expect(codeElement).not.toBeNull();
    expect(codeElement?.textContent).toContain("export function Card");

    const editButton = Array.from(
      document.body.querySelectorAll("button"),
    ).find((btn) => btn.textContent?.includes("Editar componente"));
    expect(editButton).not.toBeUndefined();

    const copyButton = Array.from(
      document.body.querySelectorAll("button"),
    ).find((btn) => btn.textContent?.includes("Copiar código"));
    expect(copyButton).not.toBeUndefined();

    await act(async () => {
      editButton?.click();
    });

    expect(handleEdit).toHaveBeenCalledWith(mockCodeComponent);
  });

  it("não renderiza link de fonte quando code_component não possui URL", async () => {
    const codeWithoutUrl: Extract<LibraryItem, { type: "code_component" }> = {
      ...mockCodeComponent,
      url: null,
    };
    await renderDialog(codeWithoutUrl);

    expect(document.body.textContent).not.toContain("Abrir fonte original");
    const sourceLink = document.body.querySelector("a[target='_blank']");
    expect(sourceLink).toBeNull();
  });

  it("mostra o header do painel com tipo e contadores no prompt", async () => {
    await renderDialog(mockPrompt);

    // mockPrompt.content — "Write a sci-fi novel starting in a retro bistro
    // on Mars." — tem 56 caracteres em uma linha.
    expect(document.body.textContent).toContain("1 linha");
    expect(document.body.textContent).toContain("56 caracteres");
  });

  it("mostra o header do painel com rótulo code no code_component", async () => {
    await renderDialog(mockCodeComponent);

    const pixelLabels = Array.from(
      document.body.querySelectorAll(".text-brand-pixel"),
    ).map((el) => el.textContent);
    expect(pixelLabels).toContain("code");
  });
});
