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

describe("TagForm", () => {
  it("prefills an existing tag and carries its id", async () => {
    await act(async () => {
      root?.render(
        <TagForm
          target={{ mode: "edit", tag: flatTags[0]! }}
          flatTags={flatTags}
          onSaved={vi.fn()}
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
});
