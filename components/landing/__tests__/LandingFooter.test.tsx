import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
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

import { LandingFooter } from "@/components/landing/LandingFooter";

describe("LandingFooter", () => {
  it("renders the footer with logo, tagline and real links", () => {
    const markup = renderToStaticMarkup(<LandingFooter />);
    expect(markup).toContain("O que você guarda continua fácil de achar.");
    expect(markup).toContain('href="/login"');
    expect(markup).toContain('href="/library"');
    expect(markup).toContain("Entrar");
    expect(markup).toContain("Biblioteca");
  });

  it("does not render decorative compliance or shortcut strips", () => {
    const markup = renderToStaticMarkup(<LandingFooter />);
    expect(markup).not.toContain("WCAG");
    expect(markup).not.toContain("Spotlight");
    expect(markup).not.toContain("•");
  });

  describe("language switch", () => {
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

    it("lets a logged-out visitor switch to English, calling setLocale('en')", async () => {
      setLocaleMock.mockResolvedValue({ ok: true, data: "en" });

      await act(async () => {
        root?.render(<LandingFooter />);
      });

      // The language switch is the only icon-only trigger in the footer nav.
      const trigger = Array.from(container!.querySelectorAll("nav button")).at(
        -1,
      ) as HTMLButtonElement;
      await act(async () => trigger.click());

      const englishOption = Array.from(
        document.querySelectorAll('[role="menuitem"]'),
      ).find((item) => item.textContent?.includes("English")) as HTMLElement;
      expect(englishOption).toBeTruthy();

      await act(async () => englishOption.click());

      expect(setLocaleMock).toHaveBeenCalledWith("en");
    });
  });
});
