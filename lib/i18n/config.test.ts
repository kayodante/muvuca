import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, resolveLocale } from "./config";

describe("resolveLocale", () => {
  it("falls back to the default when nothing is provided", () => {
    expect(resolveLocale({})).toBe(DEFAULT_LOCALE);
  });

  it("ignores a garbage cookie and falls back to the default", () => {
    expect(resolveLocale({ cookie: "not-a-locale" })).toBe(DEFAULT_LOCALE);
  });

  it("uses the cookie when there is no saved preference", () => {
    expect(resolveLocale({ cookie: "en" })).toBe("en");
  });

  it("saved preference beats the cookie", () => {
    expect(resolveLocale({ saved: "en", cookie: "pt-BR" })).toBe("en");
  });

  it("ignores a garbage saved value and falls through to the cookie", () => {
    expect(resolveLocale({ saved: "xx", cookie: "en" })).toBe("en");
  });

  it("picks the highest-q Accept-Language tag that matches a supported language", () => {
    expect(resolveLocale({ acceptLanguage: "fr;q=0.9,en;q=0.5" })).toBe("en");
  });

  it("matches en-US to en", () => {
    expect(resolveLocale({ acceptLanguage: "en-US,en;q=0.9" })).toBe("en");
  });

  it("matches pt-PT to pt-BR", () => {
    expect(resolveLocale({ acceptLanguage: "pt-PT,pt;q=0.9" })).toBe("pt-BR");
  });

  it("falls back to the default when only unsupported languages are offered", () => {
    expect(resolveLocale({ acceptLanguage: "fr" })).toBe(DEFAULT_LOCALE);
  });

  it("falls back to the default for an empty Accept-Language header", () => {
    expect(resolveLocale({ acceptLanguage: "" })).toBe(DEFAULT_LOCALE);
  });

  it("Accept-Language only applies when there is no saved value or cookie", () => {
    expect(resolveLocale({ cookie: "pt-BR", acceptLanguage: "en" })).toBe(
      "pt-BR",
    );
  });
});
