import { cache } from "react";
import { cookies, headers } from "next/headers";
import { getOptionalUser } from "@/lib/auth/require-user";
import { getUserPreferences } from "@/lib/database/queries/preferences";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "./config";
import { dictionaries, type Dictionary } from "./dictionaries";

/**
 * Resolves the request's locale: saved preference (logged-in user) > cookie
 * > browser `Accept-Language` > default. `cache()` memoizes per request, so
 * this and the root layout's own `getUserPreferences()` call for theme
 * share one DB read instead of two.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const [cookieStore, headerList, user] = await Promise.all([
    cookies(),
    headers(),
    getOptionalUser(),
  ]);

  const saved = user ? (await getUserPreferences()).locale : null;

  return resolveLocale({
    saved,
    cookie: cookieStore.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: headerList.get("accept-language"),
  });
});

/** The resolved dictionary for this request. Server Components/Actions only. */
export const getDictionary = cache(async (): Promise<Dictionary> => {
  return dictionaries[await getLocale()];
});
