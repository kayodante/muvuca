import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { SiteIdentity } from "./SiteIdentity";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

async function render(ui: React.ReactElement) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(ui);
  });
  return container;
}

describe("SiteIdentity", () => {
  it("renders the favicon image, decorative, when faviconSrc is present", async () => {
    const dom = await render(
      <SiteIdentity
        domain="nextjs.org"
        faviconSrc="/api/previews/item-1/icon?v=abc"
      />,
    );

    const img = dom.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("/api/previews/item-1/icon?v=abc");
    expect(img?.getAttribute("alt")).toBe("");
    expect(img?.getAttribute("aria-hidden")).toBe("true");
  });

  it("falls back to a monogram of the first letter when faviconSrc is null", async () => {
    const dom = await render(
      <SiteIdentity domain="nextjs.org" faviconSrc={null} />,
    );

    expect(dom.querySelector("img")).toBeNull();
    const monogram = dom.querySelector("span");
    expect(monogram).not.toBeNull();
    expect(monogram?.textContent).toBe("N");
    expect(monogram?.getAttribute("aria-hidden")).toBe("true");
  });

  it("strips a leading www. before deriving the monogram letter", async () => {
    const dom = await render(
      <SiteIdentity domain="www.github.com" faviconSrc={null} />,
    );

    expect(dom.querySelector("span")?.textContent).toBe("G");
  });

  it("derives the same swatch color for the same domain deterministically", async () => {
    const first = await render(
      <SiteIdentity domain="example.com" faviconSrc={null} />,
    );
    const firstClass = first.querySelector("span")?.className;

    await act(async () => root?.unmount());
    container?.remove();

    const second = await render(
      <SiteIdentity domain="example.com" faviconSrc={null} />,
    );
    expect(second.querySelector("span")?.className).toBe(firstClass);
  });

  it("falls back to the monogram when the favicon image fails to load", async () => {
    const dom = await render(
      <SiteIdentity
        domain="nextjs.org"
        faviconSrc="/api/previews/item-1/icon?v=abc"
      />,
    );

    const img = dom.querySelector("img");
    await act(async () => {
      img?.dispatchEvent(new Event("error"));
    });

    expect(dom.querySelector("img")).toBeNull();
    expect(dom.querySelector("span")?.textContent).toBe("N");
  });

  // A stale client-side `broken` flag must not keep hiding
  // a favicon that was replaced by a newer, valid one server-side.
  it("shows the new favicon once faviconSrc changes after a previous img error", async () => {
    const dom = await render(
      <SiteIdentity
        domain="nextjs.org"
        faviconSrc="/api/previews/item-1/icon?v=a"
      />,
    );

    const imgA = dom.querySelector("img");
    await act(async () => {
      imgA?.dispatchEvent(new Event("error"));
    });
    expect(dom.querySelector("img")).toBeNull();

    await act(async () => {
      root?.render(
        <SiteIdentity
          domain="nextjs.org"
          faviconSrc="/api/previews/item-1/icon?v=b"
        />,
      );
    });

    const imgB = dom.querySelector("img");
    expect(imgB).not.toBeNull();
    expect(imgB?.getAttribute("src")).toBe("/api/previews/item-1/icon?v=b");
  });
});
