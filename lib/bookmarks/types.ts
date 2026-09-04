export const MAX_BOOKMARK_FILE_SIZE = 10_000_000;
export const MAX_BOOKMARKS = 20_000;
export const MAX_BOOKMARK_FOLDERS = 5_000;
export const MAX_BOOKMARK_FOLDER_DEPTH = 6;
export const BOOKMARK_BATCH_SIZE = 200;
export const MAX_BOOKMARKS_PER_BATCH = 500;

export type BookmarkTag = {
  key: string;
  parentKey: string | null;
  name: string;
};

export type BookmarkItem = {
  title: string;
  url: string;
  normalizedUrl: string;
  tagKey: string | null;
};

export type BookmarkParseResult = {
  tags: BookmarkTag[];
  items: BookmarkItem[];
  invalidCount: number;
  duplicateCount: number;
  flattenedFolderCount: number;
};
