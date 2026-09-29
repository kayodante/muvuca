import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { LandingHeader } from "@/components/landing/LandingHeader";

describe("LandingHeader", () => {
  it("links to real sections and keeps access through the existing login", () => {
    const doc = new DOMParser().parseFromString(
      renderToStaticMarkup(<LandingHeader />),
      "text/html",
    );
    const hrefs = Array.from(doc.querySelectorAll("a"), (a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/",
        "#sobre",
        "#recursos",
        "#como-funciona",
        "#perguntas",
        "/login",
      ]),
    );
    expect(
      doc.querySelector('button[aria-label="Abrir menu de navegação"]'),
    ).not.toBeNull();
    expect(hrefs).not.toContain("/signup");
  });
});
