import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { UserAvatar } from "@/components/shell/UserAvatar";

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
});

async function render(avatarHash: string | null) {
  await act(async () => {
    root?.render(<UserAvatar name="Kayo Dante" avatarHash={avatarHash} />);
  });
  return {
    avatar: container!.querySelector('[aria-hidden="true"]') as HTMLElement,
    img: container!.querySelector("img"),
  };
}

describe("UserAvatar", () => {
  it("sem avatarHash, mostra as iniciais e nenhuma imagem", async () => {
    const { avatar, img } = await render(null);

    expect(avatar.textContent).toBe("KD");
    expect(img).toBeNull();
  });

  it("com avatarHash, mostra a foto same-origin com alt vazio", async () => {
    const { img } = await render("abc123");

    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("/api/avatar?v=abc123");
    expect(img?.getAttribute("alt")).toBe("");
  });

  it("erro ao carregar a foto cai para as iniciais", async () => {
    const { avatar, img } = await render("abc123");

    await act(async () => {
      img!.dispatchEvent(new Event("error"));
    });

    expect(container!.querySelector("img")).toBeNull();
    expect(avatar.textContent).toBe("KD");
  });

  it("um hash novo depois do erro tenta carregar a foto de novo", async () => {
    await render("abc123");
    await act(async () => {
      container!.querySelector("img")!.dispatchEvent(new Event("error"));
    });
    expect(container!.querySelector("img")).toBeNull();

    await act(async () => {
      root?.render(<UserAvatar name="Kayo Dante" avatarHash="def456" />);
    });

    const img = container!.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("/api/avatar?v=def456");
  });
});
