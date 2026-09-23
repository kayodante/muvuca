"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { dictionaries, type Dictionary } from "./dictionaries";

// Default is `pt-BR` so a component rendered in a unit test with no
// `<LocaleProvider>` still sees Portuguese, matching every pre-existing
// test that asserts PT copy.
const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/**
 * Wraps the app so Client Components can read the resolved locale. Only the
 * locale string crosses the server/client boundary -- each dictionary
 * module is imported locally by `useDictionary()`, not passed as a prop.
 */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

// ponytail: os dois idiomas vão no bundle cliente; separar por import
// dinâmico se o dicionário passar de ~50 KB.
export function useDictionary(): Dictionary {
  return dictionaries[useLocale()];
}
