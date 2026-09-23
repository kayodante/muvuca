import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { setLocaleMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  setLocaleMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/lib/actions/locale", () => ({ setLocale: setLocaleMock }));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: toastSuccessMock,
    error: toastErrorMock,
  }),
}));

import { LanguageSelect } from "@/components/settings/LanguageSelect";

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

async function render(locale: "pt-BR" | "en") {
  await act(async () => {
    root?.render(<LanguageSelect locale={locale} />);
  });
  const trigger = container!.querySelector("button") as HTMLButtonElement;
  await act(async () => trigger.click());
  return {
    trigger,
    getItem: (name: string) =>
      Array.from(document.querySelectorAll('[role="menuitem"]')).find((item) =>
        item.textContent?.includes(name),
      ) as HTMLElement,
  };
}

describe("LanguageSelect", () => {
  it("renders both options, each in its own language", async () => {
    const { getItem } = await render("pt-BR");

    expect(getItem("Português (Brasil)")).toBeTruthy();
    expect(getItem("English")).toBeTruthy();
  });

  it("calls setLocale with the chosen option and shows a success toast", async () => {
    setLocaleMock.mockResolvedValue({ ok: true, data: "en" });
    const { getItem } = await render("pt-BR");

    await act(async () => getItem("English").click());

    expect(setLocaleMock).toHaveBeenCalledWith("en");
    expect(toastSuccessMock).toHaveBeenCalledWith("Idioma salvo.");
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("rolls back the optimistic selection and shows an error toast on failure", async () => {
    setLocaleMock.mockResolvedValue({
      ok: false,
      code: "UNKNOWN",
      message: "Algo deu errado. Tente novamente.",
    });
    const { trigger, getItem } = await render("pt-BR");

    await act(async () => getItem("English").click());

    expect(toastErrorMock).toHaveBeenCalledWith(
      "Algo deu errado. Tente novamente.",
    );
    expect(toastSuccessMock).not.toHaveBeenCalled();

    // Rolled back to the original locale: reopen the menu and check the
    // Portuguese option is selected again (aria-current).
    await act(async () => trigger.click());
    const pt = Array.from(document.querySelectorAll('[role="menuitem"]')).find(
      (item) => item.textContent?.includes("Português (Brasil)"),
    ) as HTMLElement;
    expect(pt.getAttribute("aria-current")).toBe("true");
  });
});
