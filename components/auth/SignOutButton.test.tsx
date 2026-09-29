import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { signOutMock } = vi.hoisted(() => ({
  signOutMock: vi.fn(),
}));

vi.mock("@/lib/actions/auth", () => ({
  signOut: signOutMock,
}));

import { SignOutButton } from "./SignOutButton";
import { LocaleProvider } from "@/lib/i18n/client";

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

describe("SignOutButton", () => {
  it("renders trigger button with 'Sair' and does not call signOut on initial render", async () => {
    await act(async () => {
      root?.render(<SignOutButton />);
    });

    const trigger = Array.from(document.body.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Sair"),
    );
    expect(trigger).toBeTruthy();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it("opens confirmation alert dialog when trigger is clicked without signing out immediately", async () => {
    await act(async () => {
      root?.render(<SignOutButton />);
    });

    const trigger = Array.from(document.body.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Sair"),
    );
    await act(async () => {
      trigger?.click();
    });

    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog?.textContent).toContain("Sair da conta?");
    expect(dialog?.textContent).toContain(
      "Você precisará fazer login novamente para acessar sua biblioteca.",
    );
    // Crucial requirement: clicking trigger must NOT sign out directly
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("closes the alert dialog when cancel is clicked without calling signOut", async () => {
    await act(async () => {
      root?.render(<SignOutButton />);
    });

    const trigger = Array.from(document.body.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Sair"),
    );
    await act(async () => {
      trigger?.click();
    });

    const cancelButton = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button'),
    ).find((b) => b.textContent?.includes("Cancelar"));
    expect(cancelButton).toBeTruthy();

    await act(async () => {
      cancelButton?.click();
    });

    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("calls signOut when confirmation button inside dialog is clicked", async () => {
    signOutMock.mockResolvedValueOnce({ ok: true, data: null });

    await act(async () => {
      root?.render(<SignOutButton />);
    });

    const trigger = Array.from(document.body.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Sair"),
    );
    await act(async () => {
      trigger?.click();
    });

    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog).toBeTruthy();

    const confirmButton = Array.from(
      dialog!.querySelectorAll("button"),
    ).find((b) => b.getAttribute("type") === "submit" && b.textContent?.includes("Sair"));
    expect(confirmButton).toBeTruthy();

    await act(async () => {
      confirmButton?.click();
    });

    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it("displays error message if signOut fails", async () => {
    signOutMock.mockResolvedValueOnce({
      ok: false,
      code: "UNKNOWN",
      message: "Falha ao sair. Tente novamente.",
    });

    await act(async () => {
      root?.render(<SignOutButton />);
    });

    const trigger = Array.from(document.body.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Sair"),
    );
    await act(async () => {
      trigger?.click();
    });

    const dialog = document.querySelector('[role="alertdialog"]');
    const confirmButton = Array.from(
      dialog!.querySelectorAll("button"),
    ).find((b) => b.getAttribute("type") === "submit" && b.textContent?.includes("Sair"));

    await act(async () => {
      confirmButton?.click();
    });

    const alert = document.querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain("Falha ao sair. Tente novamente.");
  });

  it("renders translated strings under English locale", async () => {
    await act(async () => {
      root?.render(
        <LocaleProvider locale="en">
          <SignOutButton />
        </LocaleProvider>,
      );
    });

    const trigger = Array.from(document.body.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Sign out"),
    );
    expect(trigger).toBeTruthy();

    await act(async () => {
      trigger?.click();
    });

    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog?.textContent).toContain("Sign out?");
    expect(dialog?.textContent).toContain(
      "You will need to sign in again to access your library.",
    );

    const cancelButton = Array.from(
      document.body.querySelectorAll('[role="alertdialog"] button'),
    ).find((b) => b.textContent?.includes("Cancel"));
    expect(cancelButton).toBeTruthy();
  });
});
