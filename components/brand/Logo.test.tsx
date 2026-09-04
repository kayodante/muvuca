import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Logo, LogoSymbol } from "./Logo";
import { Wordmark } from "./Wordmark";

describe("Logo Component", () => {
  it("renders full logo with accessible label and SVG viewBox 0 0 279 65", () => {
    const markup = renderToStaticMarkup(<Logo variant="full" size="md" />);

    expect(markup).toContain('<span class="sr-only">Muvuca</span>');
    expect(markup).toContain('viewBox="0 0 279 65"');
    expect(markup).toContain('fill="#A5FF00"'); // Lime accent
    expect(markup).toContain('aria-hidden="true"');
  });

  it("renders symbol variant with SVG viewBox 0 0 79 65", () => {
    const markup = renderToStaticMarkup(<LogoSymbol size="sm" />);

    expect(markup).toContain('<span class="sr-only">Muvuca</span>');
    expect(markup).toContain('viewBox="0 0 79 65"');
    expect(markup).toContain('fill="#A5FF00"');
  });

  it("applies theme classes properly", () => {
    const autoMarkup = renderToStaticMarkup(<Logo theme="auto" />);
    const darkMarkup = renderToStaticMarkup(<Logo theme="dark" />);
    const lightMarkup = renderToStaticMarkup(<Logo theme="light" />);

    expect(autoMarkup).toContain("text-foreground");
    expect(darkMarkup).toContain("text-[#020005]");
    expect(lightMarkup).toContain("text-[#F5F0FF]");
  });

  it("applies size classes properly", () => {
    const smMarkup = renderToStaticMarkup(<Logo size="sm" />);
    const xlMarkup = renderToStaticMarkup(<Logo size="xl" />);

    expect(smMarkup).toContain("h-5");
    expect(xlMarkup).toContain("h-12");
  });

  it("renders Wordmark wrapper component identically to full logo", () => {
    const wordmarkMarkup = renderToStaticMarkup(<Wordmark size="lg" />);
    const logoMarkup = renderToStaticMarkup(<Logo variant="full" size="lg" />);

    expect(wordmarkMarkup).toBe(logoMarkup);
  });
});
