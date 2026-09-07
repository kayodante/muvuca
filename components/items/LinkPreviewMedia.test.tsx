import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { LinkPreviewMedia } from "./LinkPreviewMedia";
import type { PreviewSummary } from "@/lib/database/queries/previews";

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

function preview(overrides: Partial<PreviewSummary>): PreviewSummary {
  return {
    status: "ready",
    thumbnailHash: null,
    thumbnailWidth: null,
    thumbnailHeight: null,
    faviconHash: null,
    remoteDescription: null,
    siteName: null,
    errorCode: null,
    ...overrides,
  };
}

describe("LinkPreviewMedia", () => {
  it("renders a same-origin, decorative thumbnail image when ready with a hash", async () => {
    const dom = await render(
      <LinkPreviewMedia
        itemId="item-1"
        domain="nextjs.org"
        preview={preview({ status: "ready", thumbnailHash: "abc123" })}
      />,
    );

    const img = dom.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe(
      "/api/previews/item-1/thumb?v=abc123",
    );
    expect(img?.getAttribute("alt")).toBe("");
    expect(img?.getAttribute("aria-hidden")).toBe("true");
    expect(img?.getAttribute("loading")).toBe("lazy");
    expect(img?.getAttribute("width")).toBe("640");
    expect(img?.getAttribute("height")).toBe("360");
  });

  it("renders a skeleton block, no img, when pending", async () => {
    const dom = await render(
      <LinkPreviewMedia
        itemId="item-1"
        domain="nextjs.org"
        preview={preview({ status: "pending" })}
      />,
    );

    expect(dom.querySelector("img")).toBeNull();
    expect(dom.textContent).toBe("");
    expect(dom.querySelector('.t-skel[data-state="loading"]')).not.toBeNull();
    expect(dom.querySelector(".t-skel-skeleton.is-pulsing")).not.toBeNull();
    expect(dom.querySelector(".t-skel-content")).not.toBeNull();
  });

  it("renders the domain monogram fallback, no visible error text, when failed", async () => {
    const dom = await render(
      <LinkPreviewMedia
        itemId="item-1"
        domain="nextjs.org"
        preview={preview({ status: "failed" })}
      />,
    );

    expect(dom.querySelector("img")).toBeNull();
    expect(dom.textContent).toBe("N");
    expect(dom.textContent).not.toMatch(/erro|falh|indispon/i);
  });

  it.each(["http_not_found", "http_gone", "dns_failure"] as const)(
    "renders the broken-link icon (not the monogram) when failed with errorCode %s",
    async (errorCode) => {
      const dom = await render(
        <LinkPreviewMedia
          itemId="item-1"
          domain="nextjs.org"
          preview={preview({ status: "failed", errorCode })}
        />,
      );

      expect(dom.querySelector("img")).toBeNull();
      // No monogram letter rendered, and the title distinguishes this from
      // the generic "no preview" state instead of relying on color alone.
      expect(dom.textContent).toBe("");
      expect(dom.querySelector("svg")).not.toBeNull();
      expect(dom.querySelector("[title]")?.getAttribute("title")).toBe(
        "Link indisponível",
      );
    },
  );

  it("renders the domain monogram (not the broken-link icon) when failed with errorCode http_error", async () => {
    const dom = await render(
      <LinkPreviewMedia
        itemId="item-1"
        domain="nextjs.org"
        preview={preview({ status: "failed", errorCode: "http_error" })}
      />,
    );

    expect(dom.querySelector("svg")).toBeNull();
    expect(dom.textContent).toBe("N");
    expect(dom.querySelector("[title]")?.getAttribute("title")).toBe(
      "Prévia indisponível",
    );
  });

  it("renders the domain monogram (not the broken-link icon) when failed with no errorCode", async () => {
    const dom = await render(
      <LinkPreviewMedia
        itemId="item-1"
        domain="nextjs.org"
        preview={preview({ status: "failed", errorCode: null })}
      />,
    );

    expect(dom.querySelector("svg")).toBeNull();
    expect(dom.textContent).toBe("N");
  });

  it("renders the domain monogram fallback when preview is null", async () => {
    const dom = await render(
      <LinkPreviewMedia itemId="item-1" domain="nextjs.org" preview={null} />,
    );

    expect(dom.querySelector("img")).toBeNull();
    expect(dom.textContent).toBe("N");
  });

  it("renders the fallback when ready but there is no thumbnail hash", async () => {
    const dom = await render(
      <LinkPreviewMedia
        itemId="item-1"
        domain="nextjs.org"
        preview={preview({ status: "ready", thumbnailHash: null })}
      />,
    );

    expect(dom.querySelector("img")).toBeNull();
    expect(dom.textContent).toBe("N");
  });

  it("swaps to the fallback when the thumbnail img fails to load", async () => {
    const dom = await render(
      <LinkPreviewMedia
        itemId="item-1"
        domain="nextjs.org"
        preview={preview({ status: "ready", thumbnailHash: "abc123" })}
      />,
    );

    const img = dom.querySelector("img");
    await act(async () => {
      img?.dispatchEvent(new Event("error"));
    });

    expect(dom.querySelector("img")).toBeNull();
    expect(dom.textContent).toBe("N");
  });

  // A stale client-side `broken` flag must not keep hiding
  // a thumbnail that was replaced by a newer, valid one server-side.
  it("shows the new thumbnail once thumbnailHash changes after a previous img error", async () => {
    const dom = await render(
      <LinkPreviewMedia
        itemId="item-1"
        domain="nextjs.org"
        preview={preview({ status: "ready", thumbnailHash: "hash-a" })}
      />,
    );

    const imgA = dom.querySelector("img");
    await act(async () => {
      imgA?.dispatchEvent(new Event("error"));
    });
    expect(dom.querySelector("img")).toBeNull();

    await act(async () => {
      root?.render(
        <LinkPreviewMedia
          itemId="item-1"
          domain="nextjs.org"
          preview={preview({ status: "ready", thumbnailHash: "hash-b" })}
        />,
      );
    });

    const imgB = dom.querySelector("img");
    expect(imgB).not.toBeNull();
    expect(imgB?.getAttribute("src")).toBe(
      "/api/previews/item-1/thumb?v=hash-b",
    );
  });
});
