import {
  ITEM_TITLE_MAX_LENGTH,
  ITEM_URL_MAX_LENGTH,
  normalizeHttpUrl,
} from "@/lib/validation/item";
import { TAG_NAME_MAX_LENGTH } from "@/lib/validation/tag";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { dictionaries, type Dictionary } from "@/lib/i18n/dictionaries";
import {
  MAX_BOOKMARK_FILE_SIZE,
  MAX_BOOKMARK_FOLDER_DEPTH,
  MAX_BOOKMARK_FOLDERS,
  MAX_BOOKMARKS,
  type BookmarkItem,
  type BookmarkParseResult,
  type BookmarkTag,
} from "./types";

export {
  BOOKMARK_BATCH_SIZE,
  MAX_BOOKMARK_FILE_SIZE,
  MAX_BOOKMARK_FOLDER_DEPTH,
  MAX_BOOKMARK_FOLDERS,
  MAX_BOOKMARKS,
  MAX_BOOKMARKS_PER_BATCH,
} from "./types";

export class BookmarkImportError extends Error {}

/**
 * Truncates by UTF-16 code unit (matching Zod's `.max()` count), but drops a
 * trailing lone high surrogate so a truncation can never split a surrogate
 * pair in half. NOT `Array.from`/spread (code-point slicing): that can
 * exceed the Zod code-unit limit again and reintroduce the original bug.
 */
function truncateAtCodeUnit(value: string, maxLength: number): string {
  let sliced = value.slice(0, maxLength);
  if (/[\uD800-\uDBFF]$/.test(sliced)) sliced = sliced.slice(0, -1);
  return sliced;
}

/**
 * Called from the browser (never from `lib/i18n/server`, which is
 * server-only): `t` defaults to the pt-BR dictionary so existing callers
 * and tests that don't pass one keep seeing Portuguese.
 */
export function validateBookmarkFile(
  file: File,
  t: Dictionary = dictionaries[DEFAULT_LOCALE],
): { ok: true } | { ok: false; message: string } {
  if (!/\.html?$/i.test(file.name)) {
    return { ok: false, message: t.bookmarks.errors.invalidFileType };
  }
  if (file.size === 0) {
    return { ok: false, message: t.bookmarks.errors.emptyFile };
  }
  if (file.size > MAX_BOOKMARK_FILE_SIZE) {
    return { ok: false, message: t.bookmarks.errors.fileTooLarge };
  }
  return { ok: true };
}

/**
 * Parses the browser export in an inert document. The document is never
 * attached or rendered; only H3 text and A[href] values are copied to DTOs.
 * Same browser-only `t`/`locale` default as `validateBookmarkFile` above.
 */
export function parseBookmarkHtml(
  html: string,
  t: Dictionary = dictionaries[DEFAULT_LOCALE],
  locale: Locale = DEFAULT_LOCALE,
): BookmarkParseResult {
  const document = new DOMParser().parseFromString(html, "text/html");
  const tags: BookmarkTag[] = [];
  const items: BookmarkItem[] = [];
  const seenUrls = new Set<string>();
  let invalidCount = 0;
  let duplicateCount = 0;
  let flattenedFolderCount = 0;
  let nextTag = 1;

  function addLink(anchor: HTMLAnchorElement, tagKey: string | null) {
    const url = anchor.getAttribute("href")?.trim() ?? "";
    const normalizedUrl = normalizeHttpUrl(url);
    // Never truncate a URL: truncation would change which resource the
    // link points to, so an oversized URL is dropped, not shortened.
    if (
      url.length > ITEM_URL_MAX_LENGTH ||
      (normalizedUrl?.length ?? 0) > ITEM_URL_MAX_LENGTH
    ) {
      invalidCount++;
      return;
    }
    const title = truncateAtCodeUnit(
      directText(anchor),
      ITEM_TITLE_MAX_LENGTH,
    ).trim();

    if (!normalizedUrl || !title) {
      invalidCount++;
      return;
    }
    if (items.length >= MAX_BOOKMARKS) {
      throw new BookmarkImportError(
        t.bookmarks.errors.tooManyBookmarks(
          MAX_BOOKMARKS.toLocaleString(locale),
        ),
      );
    }
    if (seenUrls.has(normalizedUrl)) duplicateCount++;
    seenUrls.add(normalizedUrl);
    items.push({ title, url, normalizedUrl, tagKey });
  }

  function addFolder(
    heading: HTMLHeadingElement,
    parentKey: string | null,
    depth: number,
  ): string | null {
    const name = truncateAtCodeUnit(
      directText(heading),
      TAG_NAME_MAX_LENGTH,
    ).trim();
    if (!name) return parentKey;
    if (depth > MAX_BOOKMARK_FOLDER_DEPTH) {
      flattenedFolderCount++;
      return parentKey;
    }
    if (tags.length >= MAX_BOOKMARK_FOLDERS) {
      throw new BookmarkImportError(
        t.bookmarks.errors.tooManyFolders(
          MAX_BOOKMARK_FOLDERS.toLocaleString(locale),
        ),
      );
    }
    const key = `tag_${nextTag++}`;
    tags.push({ key, parentKey, name });
    return key;
  }

  function directChild<T extends Element>(
    element: Element,
    tagName: string,
  ): T | null {
    return (
      (Array.from(element.children).find(
        (child) => child.tagName === tagName,
      ) as T | undefined) ?? null
    );
  }

  function directText(element: Element): string {
    return Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? "")
      .join("")
      .trim();
  }

  function processContainer(
    container: Element,
    parentKey: string | null,
    depth: number,
  ) {
    const processedLists = new Set<Element>();
    for (const child of Array.from(container.children)) {
      if (processedLists.has(child)) continue;

      if (child.tagName === "P") {
        processContainer(child, parentKey, depth);
        continue;
      }
      if (child.tagName !== "DT") continue;

      const heading = directChild<HTMLHeadingElement>(child, "H3");
      const anchor = directChild<HTMLAnchorElement>(child, "A");
      if (anchor) addLink(anchor, parentKey);
      if (!heading) continue;

      const folderKey = addFolder(heading, parentKey, depth);
      const nestedList =
        directChild<HTMLDListElement>(child, "DL") ?? nextSiblingList(child);
      if (nestedList) {
        processedLists.add(nestedList);
        processContainer(nestedList, folderKey, depth + 1);
      }
    }
  }

  function nextSiblingList(element: Element): HTMLDListElement | null {
    let sibling = element.nextElementSibling;
    while (sibling?.tagName === "P") sibling = sibling.nextElementSibling;
    return sibling?.tagName === "DL" ? (sibling as HTMLDListElement) : null;
  }

  const rootLists = Array.from(document.body.querySelectorAll("dl")).filter(
    (list) => !list.parentElement?.closest("dl"),
  );
  for (const list of rootLists) processContainer(list, null, 1);

  return { tags, items, invalidCount, duplicateCount, flattenedFolderCount };
}
