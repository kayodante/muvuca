import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FlatTag } from "@/lib/tags/tree";

const { createTagMock, updateTagMock, toastSuccessMock } = vi.hoisted(() => ({
  createTagMock: vi.fn(),
  updateTagMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock("@/lib/actions/tags", () => ({
  createTag: createTagMock,
  updateTag: updateTagMock,
}));
vi.mock("sonner", () => ({ toast: { success: toastSuccessMock } }));

import { TagForm } from "./TagForm";

const flatTags: FlatTag[] = [
  {
    id: "dev",
    parentId: null,
    path: "dev",
    name: "Dev",
    colorToken: "cyan",
    description: "Código",
  },
  {
    id: "front",
    parentId: "dev",
    path: "dev/front",
    name: "Front",
    colorToken: "lime",
    description: null,
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
  vi.clearAllMocks();
});

function setValue(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

// The picker's combobox input treats a bare `Event("input")` (no
// `inputType`) as autofill and deliberately skips auto-opening/filtering --
// a real InputEvent with `inputType` is what a keystroke actually dispatches.
function typeIntoPicker(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set?.call(input, value);
  input.dispatchEvent(
    new InputEvent("input", { bubbles: true, inputType: "insertText" }),
  );
}

// Repeated "Tipografia" in two branches (Design and Design/Inspiração),
// an accented ancestor name, and a tag+descendant pair for the exclusion
// test -- the flat fixtures above are too small to exercise the parent
// picker itself.
const PICKER_TAGS: FlatTag[] = [
  {
    id: "design",
    parentId: null,
    path: "design",
    name: "Design",
    colorToken: "lime",
    description: null,
  },
  {
    id: "design-tipografia",
    parentId: "design",
    path: "design/tipografia",
    name: "Tipografia",
    colorToken: "lime",
    description: null,
  },
  {
    id: "inspiracao",
    parentId: "design",
    path: "design/inspiracao",
    name: "Inspiração",
    colorToken: "lime",
    description: null,
  },
  {
    id: "inspiracao-tipografia",
    parentId: "inspiracao",
    path: "design/inspiracao/tipografia",
    name: "Tipografia",
    colorToken: "lime",
    description: null,
  },
  {
    id: "dev",
    parentId: null,
    path: "dev",
    name: "Dev",
    colorToken: "cyan",
    description: null,
  },
  {
    id: "dev-front",
    parentId: "dev",
    path: "dev/front",
    name: "Front",
    colorToken: "lime",
    description: null,
  },
];

function getPickerInput(): HTMLInputElement {
  return container!.querySelector(
    'input[aria-labelledby="tag-parent-label"]',
  ) as HTMLInputElement;
}

function pickerOptionTexts(): string[] {
  return [...document.querySelectorAll('[role="option"]')].map(
    (node) => node.textContent?.trim() ?? "",
  );
}

function clickPickerOption(matcher: (text: string) => boolean) {
  const option = [...document.querySelectorAll('[role="option"]')].find(
    (node) => matcher(node.textContent?.trim() ?? ""),
  );
  option?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

describe("TagForm", () => {
  it("prefills an existing tag and carries its id", async () => {
    const onDirtyChange = vi.fn();
    await act(async () => {
      root?.render(
        <TagForm
          target={{ mode: "edit", tag: flatTags[0]! }}
          flatTags={flatTags}
          onSaved={vi.fn()}
          onDirtyChange={onDirtyChange}
        />,
      );
    });

    expect(
      (container!.querySelector('input[name="name"]') as HTMLInputElement)
        .value,
    ).toBe("Dev");
    expect(
      (container!.querySelector('input[name="id"]') as HTMLInputElement).value,
    ).toBe("dev");
    expect(
      (container!.querySelector('input[value="cyan"]') as HTMLInputElement)
        .checked,
    ).toBe(true);
    // Base UI's Select must not report a change on mount just because it
    // resolves its uncontrolled default value -- otherwise every row switch
    // in the /tags workspace would immediately prompt "Descartar alterações?".
    expect(onDirtyChange).not.toHaveBeenCalled();
  });

  it("reports dirty on the first edit and clean after a save", async () => {
    updateTagMock.mockResolvedValue({ ok: true, data: null });
    const onDirtyChange = vi.fn();
    const onSaved = vi.fn();
    await act(async () => {
      root?.render(
        <TagForm
          target={{ mode: "edit", tag: flatTags[0]! }}
          flatTags={flatTags}
          onSaved={onSaved}
          onDirtyChange={onDirtyChange}
        />,
      );
    });

    await act(async () =>
      setValue(
        container!.querySelector('input[name="name"]') as HTMLInputElement,
        "Dev 2",
      ),
    );
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    await act(async () => container!.querySelector("form")!.requestSubmit());

    expect(updateTagMock).toHaveBeenCalled();
    expect(toastSuccessMock).toHaveBeenCalledWith("Tag atualizada.");
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    expect(onSaved).toHaveBeenCalledWith("dev");
  });

  it("edit mode: Save starts outline, turns lime on the first edit, and returns to outline after a successful save", async () => {
    updateTagMock.mockResolvedValue({ ok: true, data: null });
    await act(async () => {
      root?.render(
        <TagForm
          target={{ mode: "edit", tag: flatTags[0]! }}
          flatTags={flatTags}
          onSaved={vi.fn()}
        />,
      );
    });

    const submit = () =>
      container!.querySelector('button[type="submit"]') as HTMLButtonElement;

    // Clean: outline, never lime -- direct edit means the form is always
    // open even with nothing pending, and "Salvar alterações" must not read
    // as a third lime call-to-action next to "Criar item"/"Criar tag".
    expect(submit().className).toContain("border-border");
    expect(submit().className).not.toContain("bg-primary");

    await act(async () =>
      setValue(
        container!.querySelector('input[name="name"]') as HTMLInputElement,
        "Dev 2",
      ),
    );
    expect(submit().className).toContain("bg-primary");
    expect(submit().className).not.toContain("border-border");

    await act(async () => container!.querySelector("form")!.requestSubmit());
    expect(submit().className).toContain("border-border");
    expect(submit().className).not.toContain("bg-primary");
  });

  it("create mode: Save is always lime, dirty or not", async () => {
    await act(async () => {
      root?.render(
        <TagForm
          target={{ mode: "create", parentId: null }}
          flatTags={flatTags}
          onSaved={vi.fn()}
        />,
      );
    });

    const submit = container!.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(submit.className).toContain("bg-primary");
  });

  it("hands the new id to onSaved after a create", async () => {
    createTagMock.mockResolvedValue({ ok: true, data: { id: "new-id" } });
    const onSaved = vi.fn();
    await act(async () => {
      root?.render(
        <TagForm
          target={{ mode: "create", parentId: "dev" }}
          flatTags={flatTags}
          onSaved={onSaved}
        />,
      );
    });

    await act(async () =>
      setValue(
        container!.querySelector('input[name="name"]') as HTMLInputElement,
        "Back",
      ),
    );
    await act(async () => container!.querySelector("form")!.requestSubmit());

    expect(onSaved).toHaveBeenCalledWith("new-id");
    expect(toastSuccessMock).toHaveBeenCalledWith("Tag criada.");
  });

  it("shows a field error bound to the name input", async () => {
    createTagMock.mockResolvedValue({
      ok: false,
      code: "DUPLICATE",
      message: "Nome duplicado.",
      fieldErrors: {
        name: ["Esse nome já está em uso nesse nível da hierarquia."],
      },
    });
    await act(async () => {
      root?.render(
        <TagForm
          target={{ mode: "create", parentId: null }}
          flatTags={flatTags}
          onSaved={vi.fn()}
        />,
      );
    });

    await act(async () =>
      setValue(
        container!.querySelector('input[name="name"]') as HTMLInputElement,
        "Dev",
      ),
    );
    await act(async () => container!.querySelector("form")!.requestSubmit());

    const input = container!.querySelector(
      'input[name="name"]',
    ) as HTMLInputElement;
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe("tag-name-error");
  });

  describe("parent picker", () => {
    it("shows repeated names with different, distinguishable paths", async () => {
      await act(async () => {
        root?.render(
          <TagForm
            target={{ mode: "create", parentId: null }}
            flatTags={PICKER_TAGS}
            onSaved={vi.fn()}
          />,
        );
      });

      await act(async () => typeIntoPicker(getPickerInput(), "Tipografia"));

      const matches = pickerOptionTexts().filter((text) =>
        text.includes("Tipografia"),
      );
      expect(matches).toHaveLength(2);
      expect(new Set(matches).size).toBe(2);
      expect(matches.some((text) => text.includes("Inspiração"))).toBe(true);
    });

    it("finds an accented tag from an unaccented query", async () => {
      await act(async () => {
        root?.render(
          <TagForm
            target={{ mode: "create", parentId: null }}
            flatTags={PICKER_TAGS}
            onSaved={vi.fn()}
          />,
        );
      });

      await act(async () => typeIntoPicker(getPickerInput(), "inspiracao"));

      expect(
        pickerOptionTexts().some((text) => text.includes("Inspiração")),
      ).toBe(true);
    });

    it("excludes the tag itself and its descendants", async () => {
      const designTag = PICKER_TAGS.find((tag) => tag.id === "design")!;
      await act(async () => {
        root?.render(
          <TagForm
            target={{ mode: "edit", tag: designTag }}
            flatTags={PICKER_TAGS}
            onSaved={vi.fn()}
          />,
        );
      });

      const input = getPickerInput();
      const trigger = input.parentElement?.querySelector(
        "button",
      ) as HTMLButtonElement;
      await act(async () => trigger.click());

      const texts = pickerOptionTexts();
      expect(texts).toHaveLength(3); // root + Dev + Front
      expect(texts.some((text) => text.includes("Design"))).toBe(false);
      expect(texts.some((text) => text.includes("Tipografia"))).toBe(false);
      expect(texts).toContain("Nenhuma (tag raiz)");
      expect(texts.some((text) => text.includes("Dev"))).toBe(true);
      expect(texts.some((text) => text.includes("Front"))).toBe(true);
    });

    it("doesn't mark the form dirty while typing, only when a value is picked", async () => {
      const onDirtyChange = vi.fn();
      const frontTag = PICKER_TAGS.find((tag) => tag.id === "dev-front")!;
      await act(async () => {
        root?.render(
          <TagForm
            target={{ mode: "edit", tag: frontTag }}
            flatTags={PICKER_TAGS}
            onSaved={vi.fn()}
            onDirtyChange={onDirtyChange}
          />,
        );
      });

      const submit = () =>
        container!.querySelector('button[type="submit"]') as HTMLButtonElement;

      await act(async () => typeIntoPicker(getPickerInput(), "Design"));
      expect(onDirtyChange).not.toHaveBeenCalled();
      // Same signal the Save button reads: typing alone must not flip it
      // from outline to lime.
      expect(submit().className).toContain("border-border");

      await act(async () => clickPickerOption((text) => text === "Design"));
      expect(onDirtyChange).toHaveBeenCalledWith(true);
      expect(submit().className).toContain("bg-primary");
    });

    it('submits the chosen parentId, and "" for root', async () => {
      createTagMock.mockResolvedValue({ ok: true, data: { id: "x" } });
      await act(async () => {
        root?.render(
          <TagForm
            target={{ mode: "create", parentId: null }}
            flatTags={PICKER_TAGS}
            onSaved={vi.fn()}
          />,
        );
      });

      await act(async () =>
        setValue(
          container!.querySelector('input[name="name"]') as HTMLInputElement,
          "Nova",
        ),
      );
      await act(async () => typeIntoPicker(getPickerInput(), "Front"));
      await act(async () =>
        clickPickerOption((text) => text.includes("Front")),
      );
      await act(async () => container!.querySelector("form")!.requestSubmit());

      const sent = createTagMock.mock.calls[0]?.[1] as FormData;
      expect(sent.get("parentId")).toBe("dev-front");
    });

    it('submits "" when root is explicitly chosen', async () => {
      createTagMock.mockResolvedValue({ ok: true, data: { id: "x" } });
      await act(async () => {
        root?.render(
          <TagForm
            target={{ mode: "create", parentId: "dev" }}
            flatTags={PICKER_TAGS}
            onSaved={vi.fn()}
          />,
        );
      });

      await act(async () =>
        setValue(
          container!.querySelector('input[name="name"]') as HTMLInputElement,
          "Nova raiz",
        ),
      );
      const input = getPickerInput();
      const trigger = input.parentElement?.querySelector(
        "button",
      ) as HTMLButtonElement;
      await act(async () => trigger.click());
      await act(async () =>
        clickPickerOption((text) => text === "Nenhuma (tag raiz)"),
      );
      await act(async () => container!.querySelector("form")!.requestSubmit());

      const sent = createTagMock.mock.calls[0]?.[1] as FormData;
      expect(sent.get("parentId")).toBe("");
    });

    it("Enter inside the open picker selects the option, not the form", async () => {
      await act(async () => {
        root?.render(
          <TagForm
            target={{ mode: "create", parentId: null }}
            flatTags={PICKER_TAGS}
            onSaved={vi.fn()}
          />,
        );
      });

      const input = getPickerInput();
      await act(async () => typeIntoPicker(input, "Front"));

      let notCanceled = true;
      await act(async () => {
        notCanceled = input.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Enter",
            bubbles: true,
            cancelable: true,
          }),
        );
      });

      expect(notCanceled).toBe(false);
      expect(createTagMock).not.toHaveBeenCalled();
    });
  });
});
