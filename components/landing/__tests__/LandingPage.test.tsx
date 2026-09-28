import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { LandingPage } from "@/components/landing/LandingPage";
import { LocaleProvider } from "@/lib/i18n/client";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { LOCALES } from "@/lib/i18n/config";

describe("LandingPage", () => {
  it.each(LOCALES)(
    "renders localized content, working anchors and labelled media slots in %s",
    (locale) => {
      const t = dictionaries[locale].landing;
      const markup = renderToStaticMarkup(
        <LocaleProvider locale={locale}>
          <LandingPage copy={t} locale={locale} />
        </LocaleProvider>,
      );
      const doc = new DOMParser().parseFromString(markup, "text/html");
      expect(doc.querySelectorAll("h1")).toHaveLength(1);
      expect(doc.querySelector("h1")?.textContent).toBe(t.hero.title);
      for (const landmark of ["header", "main", "footer"])
        expect(doc.querySelector(landmark)).not.toBeNull();
      for (const link of doc.querySelectorAll('a[href^="#"]')) {
        expect(
          doc.getElementById(link.getAttribute("href")!.slice(1)),
        ).not.toBeNull();
      }
      const slots = doc.querySelectorAll("[data-asset-slot]");
      expect(slots.length).toBeGreaterThan(3);
      for (const slot of slots)
        expect(slot.textContent).toContain(t.media.pending);
      expect(doc.querySelectorAll("details")).toHaveLength(t.faq.items.length);
      expect(doc.querySelector('a[href="/login"]')).not.toBeNull();
      expect(markup).not.toContain("data-step-state");
      for (const img of doc.querySelectorAll("img"))
        expect(img.getAttribute("src")).toMatch(/^\//);
    },
  );
});
