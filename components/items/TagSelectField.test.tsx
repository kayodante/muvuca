import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TagSelectField } from "./TagSelectField";
import type { Tag } from "@/lib/database/queries/tags";

const mockTags: Tag[] = [
  {
    id: "tag-1",
    name: "Engenharia",
    colorToken: "blue",
    description: null,
    parentId: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    id: "tag-2",
    name: "React",
    colorToken: "cyan",
    description: null,
    parentId: "tag-1",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    id: "tag-3",
    name: "Design",
    colorToken: "purple",
    description: null,
    parentId: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
];

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.clearAllMocks();
});

async function renderField(
  props: Partial<React.ComponentProps<typeof TagSelectField>> = {},
) {
  await act(async () => {
    root?.render(<TagSelectField id="test-tags" tags={mockTags} {...props} />);
  });
}

function setInputValue(input: HTMLInputElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;
  nativeInputValueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("TagSelectField", () => {
  it("renderiza inputs ocultos para cada tag selecionada", async () => {
    await renderField({
      defaultValue: ["tag-1", "tag-2"],
    });

    const hiddenInputs = document.querySelectorAll<HTMLInputElement>(
      'input[type="hidden"][name="tagIds"]',
    );
    expect(hiddenInputs).toHaveLength(2);
    expect(hiddenInputs[0]?.value).toBe("tag-1");
    expect(hiddenInputs[1]?.value).toBe("tag-2");
  });

  it("renderiza chips com swatch de cor e botão de remoção para tags selecionadas", async () => {
    await renderField({
      defaultValue: ["tag-1"],
    });

    expect(document.body.textContent).toContain("Engenharia");
    const removeBtn = document.querySelector(
      'button[aria-label="Remover tag Engenharia"]',
    );
    expect(removeBtn).not.toBeNull();

    await act(async () => {
      removeBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const hiddenInputs = document.querySelectorAll(
      'input[type="hidden"][name="tagIds"]',
    );
    expect(hiddenInputs).toHaveLength(0);
    expect(document.body.textContent).not.toContain("Engenharia");
  });

  it("abre o dropdown e permite selecionar e deselecionar tags", async () => {
    const onChange = vi.fn();
    await renderField({
      defaultValue: [],
      onChange,
    });

    const trigger = document.querySelector(
      'button[aria-haspopup="listbox"]',
    ) as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    // Abrir dropdown
    await act(async () => {
      trigger.click();
    });

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const listbox = document.querySelector('[role="listbox"]');
    expect(listbox).not.toBeNull();

    const options = document.querySelectorAll('[role="option"]');
    expect(options.length).toBe(3);

    // Selecionar "Engenharia"
    await act(async () => {
      (options[0] as HTMLElement | undefined)?.click();
    });

    expect(onChange).toHaveBeenCalledWith(["tag-1"]);
    const hiddenInputs = document.querySelectorAll(
      'input[type="hidden"][name="tagIds"]',
    );
    expect(hiddenInputs).toHaveLength(1);

    // Deselecionar "Engenharia"
    await act(async () => {
      (options[0] as HTMLElement | undefined)?.click();
    });

    expect(onChange).toHaveBeenCalledWith([]);
    const updatedHiddenInputs = document.querySelectorAll(
      'input[type="hidden"][name="tagIds"]',
    );
    expect(updatedHiddenInputs).toHaveLength(0);
  });

  it("filtra tags através do campo de busca", async () => {
    await renderField();

    const trigger = document.querySelector(
      'button[aria-haspopup="listbox"]',
    ) as HTMLButtonElement;
    await act(async () => {
      trigger.click();
    });

    const searchInput = document.querySelector(
      'input[type="text"][placeholder*="Buscar"]',
    ) as HTMLInputElement;
    expect(searchInput).not.toBeNull();

    await act(async () => {
      setInputValue(searchInput, "React");
    });

    const options = document.querySelectorAll('[role="option"]');
    const visibleTexts = Array.from(options).map((opt) => opt.textContent);
    expect(visibleTexts.some((t) => t?.includes("React"))).toBe(true);
    expect(visibleTexts.some((t) => t?.includes("Design"))).toBe(false);
  });

  it("fecha o dropdown com a tecla Escape", async () => {
    await renderField();

    const trigger = document.querySelector(
      'button[aria-haspopup="listbox"]',
    ) as HTMLButtonElement;
    await act(async () => {
      trigger.click();
    });

    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("renderiza estado desabilitado quando tags está vazio", async () => {
    await renderField({
      tags: [],
    });

    const trigger = document.querySelector(
      'button[aria-haspopup="listbox"]',
    ) as HTMLButtonElement;
    expect(trigger.disabled).toBe(true);
    expect(document.body.textContent).toContain("Nenhuma tag cadastrada ainda");
  });

  it("associa aria-describedby e aria-invalid com erros de campo", async () => {
    await renderField({
      error: "Uma ou mais tags são inválidas.",
      ariaDescribedBy: "item-tags-hint",
    });

    const trigger = document.querySelector(
      'button[aria-haspopup="listbox"]',
    ) as HTMLButtonElement;
    expect(trigger.getAttribute("aria-invalid")).toBe("true");
    expect(trigger.getAttribute("aria-describedby")).toBe("item-tags-hint");
  });
});
