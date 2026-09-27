"use client";

import {
  useEffect,
  useId,
  useState,
  useMemo,
  useRef,
  useTransition,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import {
  SearchIcon,
  LinkIcon,
  FileTextIcon,
  Code2Icon,
  ExternalLinkIcon,
  CheckIcon,
  CopyIcon,
  XIcon,
  CornerDownLeftIcon,
  PlusIcon,
  LibraryIcon,
  TagIcon,
  SettingsIcon,
  SunMoonIcon,
  EyeIcon,
  Loader2Icon,
} from "lucide-react";

import type { LibraryItemSummary } from "@/lib/database/queries/items";
import type { FlatTag } from "@/lib/tags/tree";
import { normalizeForSearch } from "@/lib/tags/tree";
import type { Tag } from "@/lib/database/queries/tags";
import { swatchClassFor } from "@/lib/tags/colors";
import { copyToClipboard } from "@/lib/clipboard";
import { getItemDetails } from "@/lib/actions/items";
import { normalizeHttpUrl } from "@/lib/validation/item";
import { cssDurationToMs } from "@/lib/motion/duration";
import {
  getSpotlightInitialData,
  searchSpotlightItems,
  type SpotlightData,
} from "@/lib/actions/spotlight";
import type { ActionResult } from "@/lib/utils/result";
import { setTheme } from "@/lib/actions/theme";
import { useDictionary } from "@/lib/i18n/client";
import { useSpotlight } from "./SpotlightContext";
import { QuickLookPreview } from "./QuickLookPreview";
import { cn } from "@/lib/utils";
import { toastError, toastSuccess } from "@/components/states/Toast";

type QuickAction = {
  id: string;
  kind: "action";
  title: string;
  description: string;
  icon: typeof PlusIcon;
  keywords: string[];
  run: () => void;
};

type OptionGroup = "actions" | "recent" | "items";

type OptionItem =
  | { kind: "action"; group: OptionGroup; action: QuickAction }
  | { kind: "item"; group: OptionGroup; item: LibraryItemSummary };

/** Last fetch that landed, tagged with the query/tag key it answers. */
type SpotlightResults = {
  key: string;
  items: LibraryItemSummary[];
  hasMore: boolean;
};

interface MuvucaSpotlightProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialTags?: (FlatTag | Tag)[];
}

function actionMatchesQuery(action: QuickAction, q: string): boolean {
  return (
    action.title.toLowerCase().includes(q) ||
    action.description.toLowerCase().includes(q) ||
    action.keywords.some((kw) => kw.includes(q))
  );
}

/**
 * ponytail: reorders only the newest-PAGE_SIZE page `search_library` already
 * returned for this key; it never filters. Real relevance ranking (title vs
 * body match) needs a sort inside `search_library`, not a client partition.
 */
function partitionTitleMatchesFirst(
  items: LibraryItemSummary[],
  query: string,
): LibraryItemSummary[] {
  if (!query) return items;
  const q = normalizeForSearch(query);
  const titleMatches: LibraryItemSummary[] = [];
  const rest: LibraryItemSummary[] = [];
  for (const item of items) {
    if (normalizeForSearch(item.title).includes(q)) {
      titleMatches.push(item);
    } else {
      rest.push(item);
    }
  }
  return [...titleMatches, ...rest];
}

export function MuvucaSpotlight({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  initialTags = [],
}: MuvucaSpotlightProps) {
  const t = useDictionary();
  const router = useRouter();
  const context = useSpotlight();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : context.isOpen;
  const onOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (isControlled) {
        controlledOnOpenChange?.(nextOpen);
      } else {
        context.setIsOpen(nextOpen);
      }
    },
    [isControlled, controlledOnOpenChange, context],
  );

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(
    null,
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [quickLookOpen, setQuickLookOpen] = useState(false);

  // Data states
  const [results, setResults] = useState<SpotlightResults | null>(null);
  const [tags, setTags] = useState<(FlatTag | Tag)[]>(initialTags);
  const [loadError, setLoadError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const [isSearching, startSearchTransition] = useTransition();

  // Animation lifecycle
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const latestRequestIdRef = useRef(0);
  // Enter pressed on an item while its query/tag key was still loading:
  // resolved by the pending-Enter effect once fresh results for that key land.
  const pendingEnterRef = useRef(false);

  const listboxId = useId();
  const optionId = useCallback(
    (index: number) => `${listboxId}-option-${index}`,
    [listboxId],
  );
  // Option name/description come from these ids, not from the option's full
  // textContent -- otherwise a code item's ~2k-char snippet becomes its
  // accessible name.
  const optionTitleId = useCallback(
    (index: number) => `${listboxId}-option-${index}-title`,
    [listboxId],
  );
  const optionMetaId = useCallback(
    (index: number) => `${listboxId}-option-${index}-meta`,
    [listboxId],
  );
  const tagFilterLabelId = useId();
  const footerLegendId = useId();

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && !mounted) setMounted(true);
    if (!open && entered) setEntered(false);
    if (open) {
      // Reopening starts clean: a query/tag filter or error from the last
      // session must not survive. `results` is kept on purpose -- reopening
      // with an empty query can show the cached recents immediately while
      // the effect below revalidates them.
      setQuery("");
      setSelectedTagFilter(null);
      setSelectedIndex(0);
      setQuickLookOpen(false);
      setLoadError(false);
    }
  }
  const closing = !open && mounted;

  useEffect(() => {
    if (!open || !mounted) return;
    // A ref write is a side effect, not a render-time state adjustment, so
    // it belongs here rather than in the `open !== prevOpen` block above.
    pendingEnterRef.current = false;
    const frame = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(frame);
  }, [open, mounted]);

  // Keep dialog mounted for exit animation
  useEffect(() => {
    if (!closing) return;
    const reducedMotion =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;
    const closeDelay = cssDurationToMs(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--modal-close-dur",
      ),
      120,
    );
    const timer = window.setTimeout(
      () => setMounted(false),
      reducedMotion ? 0 : closeDelay,
    );
    return () => clearTimeout(timer);
  }, [closing]);

  // Focus management, scroll lock, and focus restoration
  useEffect(() => {
    if (open) {
      previousActiveElementRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const timer = setTimeout(() => inputRef.current?.focus(), 30);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = originalOverflow;
      };
    } else {
      previousActiveElementRef.current?.focus();
    }
  }, [open]);

  // Global shortcut ⌘K / Ctrl+K, Escape, and modal focus trap
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        if (quickLookOpen) {
          setQuickLookOpen(false);
        } else {
          onOpenChange(false);
        }
      } else if (e.key === "Tab" && open) {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) {
          e.preventDefault();
          return;
        }
        if (e.shiftKey) {
          if (
            document.activeElement === first ||
            !dialog.contains(document.activeElement)
          ) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (
            document.activeElement === last ||
            !dialog.contains(document.activeElement)
          ) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange, quickLookOpen]);

  // Load initial data and debounced search without race conditions. Both
  // paths run inside the transition (isSearching covers the very first
  // load too) and both funnel through `run`, so a rejection or `res.ok ===
  // false` always sets loadError and clears stale items -- never a silent
  // empty catch.
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    const key = `${trimmed}\u0000${selectedTagFilter ?? ""}`;
    const requestId = ++latestRequestIdRef.current;

    async function run(promise: Promise<ActionResult<SpotlightData>>) {
      try {
        const res = await promise;
        if (requestId !== latestRequestIdRef.current) return;
        if (res.ok) {
          setLoadError(false);
          setResults({
            key,
            items: res.data.items,
            hasMore: res.data.hasMore,
          });
          if (res.data.tags.length > 0) setTags(res.data.tags);
        } else {
          setLoadError(true);
          setResults(null);
        }
      } catch {
        if (requestId !== latestRequestIdRef.current) return;
        setLoadError(true);
        setResults(null);
      }
    }

    if (!trimmed && !selectedTagFilter) {
      startSearchTransition(() => run(getSpotlightInitialData()));
      return;
    }

    const timeout = window.setTimeout(() => {
      startSearchTransition(() =>
        run(searchSpotlightItems(trimmed, selectedTagFilter)),
      );
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [open, query, selectedTagFilter, retryNonce]);

  function handleRetry() {
    setLoadError(false);
    setRetryNonce((n) => n + 1);
  }

  function handleClearSearch() {
    setQuery("");
    setSelectedTagFilter(null);
    setSelectedIndex(0);
    pendingEnterRef.current = false;
    inputRef.current?.focus();
  }

  // System quick actions
  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: "action-create-item",
        kind: "action",
        title: t.spotlight.quickActions.createItem.title,
        description: t.spotlight.quickActions.createItem.description,
        icon: PlusIcon,
        keywords: t.spotlight.quickActions.createItem.keywords,
        run: () => {
          onOpenChange(false);
          router.push("/library?create=1");
        },
      },
      {
        id: "action-goto-library",
        kind: "action",
        title: t.spotlight.quickActions.goToLibrary.title,
        description: t.spotlight.quickActions.goToLibrary.description,
        icon: LibraryIcon,
        keywords: t.spotlight.quickActions.goToLibrary.keywords,
        run: () => {
          onOpenChange(false);
          router.push("/library");
        },
      },
      {
        id: "action-goto-tags",
        kind: "action",
        title: t.spotlight.quickActions.manageTags.title,
        description: t.spotlight.quickActions.manageTags.description,
        icon: TagIcon,
        keywords: t.spotlight.quickActions.manageTags.keywords,
        run: () => {
          onOpenChange(false);
          router.push("/tags");
        },
      },
      {
        id: "action-goto-settings",
        kind: "action",
        title: t.spotlight.quickActions.settings.title,
        description: t.spotlight.quickActions.settings.description,
        icon: SettingsIcon,
        keywords: t.spotlight.quickActions.settings.keywords,
        run: () => {
          onOpenChange(false);
          router.push("/settings");
        },
      },
      {
        id: "action-toggle-theme",
        kind: "action",
        title: t.spotlight.quickActions.toggleTheme.title,
        description: t.spotlight.quickActions.toggleTheme.description,
        icon: SunMoonIcon,
        keywords: t.spotlight.quickActions.toggleTheme.keywords,
        run: () => {
          // "system" sets no class on <html> (app/layout.tsx): effective
          // dark also needs the media query, not just `.dark`/`.light`.
          const root = document.documentElement;
          const isDark =
            root.classList.contains("dark") ||
            (!root.classList.contains("light") &&
              window.matchMedia("(prefers-color-scheme: dark)").matches);
          const next = isDark ? "light" : "dark";
          void setTheme(next).then((res) => {
            if (res.ok) {
              toastSuccess(
                next === "dark"
                  ? t.spotlight.themeChangedDark
                  : t.spotlight.themeChangedLight,
              );
            }
          });
          onOpenChange(false);
        },
      },
    ],
    [router, onOpenChange, t],
  );

  const trimmedQuery = query.trim();
  const hasTagFilter = selectedTagFilter !== null;
  const isEmptySearch = !trimmedQuery && !hasTagFilter;
  const currentKey = `${trimmedQuery}\u0000${selectedTagFilter ?? ""}`;
  const stale = results?.key !== currentKey;
  // Own useMemo so a stable reference reaches the flatOptions memo below --
  // `results?.items ?? []` would otherwise be a fresh array every render.
  const currentItems = useMemo(() => results?.items ?? [], [results]);
  const freshHasMore = !stale && (results?.hasMore ?? false);
  // Fresh, no error, and (a query or a tag filter) but zero items: the
  // listbox stays mounted (the Ações group may still show keyword matches)
  // but the actual "no items" feedback renders above it, in the same slot
  // commit 1 uses for the load error.
  const showEmptyState =
    !loadError && !stale && !isEmptySearch && currentItems.length === 0;
  // The empty message quotes the query, or -- when filtering by tag alone --
  // the tag name, so it never reads as `Nenhum item encontrado para "".`
  const emptyStateSubject =
    trimmedQuery ||
    tags.find((tag) => tag.id === selectedTagFilter)?.name ||
    "";
  // Single source for the always-mounted live region: priority is error,
  // then in-flight/stale, then (for an active query/filter) count or
  // no-items, and finally silence for the empty-query recents so opening
  // the spotlight doesn't chatter.
  const statusText = loadError
    ? t.spotlight.loadFailed
    : isSearching || stale
      ? t.spotlight.searching
      : isEmptySearch
        ? ""
        : currentItems.length === 0
          ? t.spotlight.noItems(emptyStateSubject)
          : t.spotlight.itemCount(currentItems.length, freshHasMore);

  // Dynamic "Ver todos na biblioteca" option: only once there is a query or
  // tag filter and the server said there is more than this page.
  const seeAllAction: QuickAction | null = useMemo(() => {
    if (isEmptySearch || !freshHasMore) return null;
    return {
      id: "action-see-all",
      kind: "action",
      title: t.spotlight.seeAll,
      description: t.spotlight.seeAllDescription,
      icon: LibraryIcon,
      keywords: [],
      run: () => {
        const params = new URLSearchParams();
        if (trimmedQuery) params.set("q", trimmedQuery);
        if (selectedTagFilter) params.set("tag", selectedTagFilter);
        onOpenChange(false);
        router.push(`/library?${params.toString()}`);
      },
    };
  }, [
    isEmptySearch,
    freshHasMore,
    trimmedQuery,
    selectedTagFilter,
    onOpenChange,
    router,
    t,
  ]);

  // Filter actions and items, tagging each option with the group it renders
  // under. Order matters: it IS the keyboard order.
  const flatOptions: OptionItem[] = useMemo(() => {
    if (isEmptySearch) {
      const options: OptionItem[] = quickActions.map((action) => ({
        kind: "action",
        group: "actions",
        action,
      }));
      for (const item of currentItems) {
        options.push({ kind: "item", group: "recent", item });
      }
      return options;
    }

    const options: OptionItem[] = partitionTitleMatchesFirst(
      currentItems,
      trimmedQuery,
    ).map((item) => ({ kind: "item", group: "items", item }) as OptionItem);

    if (seeAllAction) {
      options.push({ kind: "action", group: "items", action: seeAllAction });
    }

    if (trimmedQuery) {
      const q = trimmedQuery.toLowerCase();
      for (const action of quickActions) {
        if (actionMatchesQuery(action, q)) {
          options.push({ kind: "action", group: "actions", action });
        }
      }
    }

    return options;
  }, [isEmptySearch, quickActions, currentItems, trimmedQuery, seeAllAction]);

  // Consecutive options of the same group, for the cmdk heading pattern.
  const optionBlocks = useMemo(() => {
    const blocks: {
      group: OptionGroup;
      entries: { option: OptionItem; idx: number }[];
    }[] = [];
    flatOptions.forEach((option, idx) => {
      const last = blocks[blocks.length - 1];
      if (last && last.group === option.group) {
        last.entries.push({ option, idx });
      } else {
        blocks.push({ group: option.group, entries: [{ option, idx }] });
      }
    });
    return blocks;
  }, [flatOptions]);

  const safeSelectedIndex =
    flatOptions.length > 0
      ? Math.min(selectedIndex, flatOptions.length - 1)
      : 0;

  const currentOption = flatOptions[safeSelectedIndex];
  const currentItem =
    currentOption?.kind === "item" ? currentOption.item : null;

  // Auto-scroll selected item into view
  useEffect(() => {
    if (flatOptions.length === 0) return;
    const activeElement = document.getElementById(optionId(safeSelectedIndex));
    if (activeElement && typeof activeElement.scrollIntoView === "function") {
      activeElement.scrollIntoView({ block: "nearest" });
    }
  }, [safeSelectedIndex, flatOptions.length, optionId]);

  const handleAction = useCallback(
    async (option: OptionItem) => {
      if (option.kind === "action") {
        option.action.run();
        return;
      }

      const item = option.item;
      if (item.type === "link" && item.url) {
        const safeUrl = normalizeHttpUrl(item.url);
        if (safeUrl) {
          window.open(safeUrl, "_blank", "noopener,noreferrer");
          onOpenChange(false);
        } else {
          toastError(t.spotlight.invalidUrl);
        }
      } else if (item.type === "prompt" || item.type === "code_component") {
        const fallback = item.contentPreview ?? "";
        const fullContentPromise = getItemDetails(item.id).then((res) => {
          if (
            res.ok &&
            (res.data.type === "prompt" || res.data.type === "code_component")
          ) {
            return res.data.content;
          }
          return fallback;
        });
        const ok = await copyToClipboard(fullContentPromise);
        if (ok) {
          setCopiedId(item.id);
          toastSuccess(
            item.type === "prompt"
              ? t.spotlight.promptCopiedMessage
              : t.spotlight.codeCopiedMessage,
          );
          setTimeout(() => setCopiedId(null), 2000);
        } else {
          toastError(t.spotlight.copyContentFailed);
        }
      }
    },
    [onOpenChange, t],
  );

  // Resolves an Enter pressed while results for the current key were still
  // loading: acts on the option at the current index only once fresh results
  // for THIS key land, never on the stale items that were on screen.
  useEffect(() => {
    if (!pendingEnterRef.current || stale) return;
    pendingEnterRef.current = false;
    const option = flatOptions[safeSelectedIndex];
    if (!option) return;
    // Deferred to a microtask: `handleAction` is a real external side effect
    // (open/copy/navigate), not state synchronization, so it belongs outside
    // the effect's own commit rather than running inside it.
    queueMicrotask(() => void handleAction(option));
  }, [stale, flatOptions, safeSelectedIndex, handleAction]);

  // Keyboard navigation within list
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      pendingEnterRef.current = false;
      setSelectedIndex((prev) =>
        prev < flatOptions.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      pendingEnterRef.current = false;
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : flatOptions.length - 1,
      );
    } else if (e.key === "Enter" && flatOptions[safeSelectedIndex]) {
      e.preventDefault();
      const option = flatOptions[safeSelectedIndex];
      if (option.kind === "item" && stale) {
        // Results for the current query/tag key haven't landed yet -- wait
        // for them instead of acting on the still-visible stale items.
        pendingEnterRef.current = true;
        return;
      }
      void handleAction(option);
    } else if (e.key === " " && query === "") {
      // Spacebar toggles Quick Look when there's no query typed yet (macOS
      // Quick Look habit). Ctrl/Alt/Meta+Space is gone: it collided with OS
      // input-source switching and window-menu shortcuts.
      if (currentItem) {
        e.preventDefault();
        setQuickLookOpen((prev) => !prev);
      }
    } else if (e.key === "ArrowRight") {
      // → opens the preview, but only from the caret at the end of the text
      // -- otherwise it can never be used to move the caret right.
      const input = e.currentTarget;
      const atEnd =
        input.selectionStart === input.selectionEnd &&
        input.selectionStart === input.value.length;
      if (atEnd && currentItem) {
        e.preventDefault();
        setQuickLookOpen(true);
      }
    } else if (e.key === "ArrowLeft") {
      const input = e.currentTarget;
      const atEnd =
        input.selectionStart === input.selectionEnd &&
        input.selectionStart === input.value.length;
      if (atEnd && quickLookOpen) {
        e.preventDefault();
        setQuickLookOpen(false);
      }
    }
  }

  function renderOption(option: OptionItem, idx: number) {
    const isSelected = idx === safeSelectedIndex;

    if (option.kind === "action") {
      const action = option.action;
      const Icon = action.icon;
      return (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
        <div
          key={action.id}
          id={optionId(idx)}
          role="option"
          aria-selected={isSelected}
          aria-labelledby={optionTitleId(idx)}
          aria-describedby={optionMetaId(idx)}
          onMouseEnter={() => setSelectedIndex(idx)}
          onClick={() => handleAction(option)}
          className={`group flex cursor-pointer items-center justify-between rounded-lg p-2.5 transition-colors duration-(--motion-fast) ease-out-muvuca ${
            isSelected
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex size-7 shrink-0 items-center justify-center rounded-md border ${
                isSelected
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              <Icon className="size-3.5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span
                id={optionTitleId(idx)}
                className="text-body-sm truncate font-medium text-foreground"
              >
                {action.title}
              </span>
              <p
                id={optionMetaId(idx)}
                className="text-metadata truncate text-muted-foreground"
              >
                {action.description}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 pl-3">
            <span className="text-metadata hidden text-muted-foreground group-hover:text-foreground sm:inline">
              {t.spotlight.execute}
            </span>
            {isSelected && (
              <CornerDownLeftIcon
                className="hidden size-3.5 text-primary sm:block"
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      );
    }

    // Library Item option
    const item = option.item;
    const isLink = item.type === "link";
    const isPrompt = item.type === "prompt";
    const isCode = item.type === "code_component";

    let domain: string | null = null;
    if (isLink && item.url) {
      try {
        domain = new URL(item.url).hostname;
      } catch {
        domain = item.url;
      }
    }

    const snippet =
      item.description || ("contentPreview" in item ? item.contentPreview : "");

    return (
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
      <div
        key={item.id}
        id={optionId(idx)}
        role="option"
        aria-selected={isSelected}
        aria-labelledby={optionTitleId(idx)}
        aria-describedby={optionMetaId(idx)}
        onMouseEnter={() => setSelectedIndex(idx)}
        onClick={() => handleAction(option)}
        className={`group flex cursor-pointer items-center justify-between rounded-lg p-2.5 transition-colors duration-(--motion-fast) ease-out-muvuca ${
          isSelected
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:bg-muted/50"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex size-8 shrink-0 items-center justify-center rounded-md border ${
              isSelected
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {isLink && <LinkIcon className="size-4" aria-hidden="true" />}
            {isPrompt && <FileTextIcon className="size-4" aria-hidden="true" />}
            {isCode && <Code2Icon className="size-4" aria-hidden="true" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                id={optionTitleId(idx)}
                className="text-body-sm truncate font-medium text-foreground"
              >
                {item.title}
              </span>
              <span
                id={optionMetaId(idx)}
                className="text-metadata shrink-0 font-mono text-muted-foreground uppercase"
              >
                {isLink
                  ? domain
                  : isPrompt
                    ? t.spotlight.badges.prompt
                    : item.language || "CODE"}
              </span>
            </div>
            {snippet && (
              <p className="text-metadata truncate text-muted-foreground">
                {snippet}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 pl-3">
          {/* Quick Look peek affordance: pointer-only. Keyboard already
              reaches the preview via → on the option itself (see
              handleInputKeyDown), so this is aria-hidden rather than a
              second Tab stop with an inflated option name. No aria-label
              here: aria-hidden discards it, Rams correctly flagged it as
              dead. */}
          <span
            aria-hidden="true"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedIndex(idx);
              setQuickLookOpen((prev) => !prev);
            }}
            className={cn(
              "rounded p-1 text-muted-foreground transition-colors hover:text-foreground",
              quickLookOpen && isSelected && "text-primary",
            )}
            title={t.spotlight.quickLookTitle}
          >
            <EyeIcon className="size-3.5" />
          </span>

          {isLink ? (
            <span className="text-metadata hidden items-center gap-1 text-muted-foreground group-hover:text-foreground sm:inline-flex">
              <span>{t.spotlight.open}</span>
              <ExternalLinkIcon className="size-3" />
            </span>
          ) : (
            // Same pointer-only rationale as the eye above: Enter on the
            // option copies, so this doesn't need its own Tab stop or name.
            <span
              aria-hidden="true"
              onClick={(e) => {
                e.stopPropagation();
                handleAction(option);
              }}
              className="text-metadata inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-1 text-foreground transition-colors duration-(--motion-fast) ease-out-muvuca group-hover:bg-primary group-hover:text-primary-foreground motion-reduce:transition-none"
            >
              {copiedId === item.id ? (
                <>
                  <CheckIcon className="size-3" />
                  <span>{t.spotlight.copiedShort}</span>
                </>
              ) : (
                <>
                  <CopyIcon className="size-3" />
                  <span>{t.spotlight.copyShort}</span>
                </>
              )}
            </span>
          )}
          {isSelected && (
            <CornerDownLeftIcon
              className="hidden size-3.5 text-primary sm:block"
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    );
  }

  if (!mounted) return null;

  return (
    // Backdrop: decorativo com fechamento ao clicar fora e listener de Escape.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[8vh] backdrop-blur-xs transition-opacity duration-(--motion-fast) motion-reduce:transition-none sm:pt-[10vh]",
        closing ? "animate-out fade-out" : "animate-in fade-in",
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t.spotlight.dialogLabel}
        className={cn(
          "t-modal relative flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-2xl transition-[max-width] duration-(--motion-fast) ease-out-muvuca sm:flex-row",
          quickLookOpen && currentItem ? "max-w-4xl" : "max-w-2xl",
          closing ? "is-closing" : entered ? "is-open" : undefined,
        )}
      >
        {/* Main Column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header Search Bar */}
          <div className="flex items-center gap-3 border-b border-border bg-muted/20 px-4 py-3.5">
            {isSearching ? (
              <Loader2Icon
                className="size-5 shrink-0 animate-spin text-primary"
                aria-hidden="true"
              />
            ) : (
              <SearchIcon
                className="size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            )}
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-activedescendant={
                flatOptions.length > 0 ? optionId(safeSelectedIndex) : undefined
              }
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
                pendingEnterRef.current = false;
              }}
              onKeyDown={handleInputKeyDown}
              placeholder={t.spotlight.searchPlaceholder}
              className="text-body-md w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
              aria-label={t.spotlight.searchInputLabel}
              aria-describedby={footerLegendId}
            />

            <div className="flex items-center gap-2">
              <span className="text-brand-pixel hidden rounded-md bg-primary/10 px-2 py-0.5 text-primary sm:inline">
                MUVUCA SPOTLIGHT
              </span>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-md p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t.spotlight.closeSpotlight}
              >
                <XIcon className="size-4" />
              </button>
            </div>
          </div>

          {/* Always mounted: a live region inserted together with its text is
              not announced, only a change to one that already exists. */}
          <span role="status" className="sr-only">
            {statusText}
          </span>

          {/* Tag quick filters */}
          {tags.length > 0 && (
            <div className="text-metadata flex items-center gap-1.5 overflow-x-auto border-b border-border bg-muted/10 px-4 py-2">
              <span
                id={tagFilterLabelId}
                className="mr-1 shrink-0 text-muted-foreground"
              >
                {t.spotlight.filterByTag}
              </span>
              <div
                role="group"
                aria-labelledby={tagFilterLabelId}
                className="contents"
              >
                <button
                  type="button"
                  aria-pressed={selectedTagFilter === null}
                  onClick={() => {
                    setSelectedTagFilter(null);
                    setSelectedIndex(0);
                    inputRef.current?.focus();
                  }}
                  className={`shrink-0 rounded-md px-2 py-0.5 transition-colors duration-(--motion-fast) ease-out-muvuca outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
                    selectedTagFilter === null
                      ? "bg-primary font-medium text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t.spotlight.allTag}
                </button>
                {tags.slice(0, 8).map((tag) => {
                  const isSelected = selectedTagFilter === tag.id;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        setSelectedTagFilter(isSelected ? null : tag.id);
                        setSelectedIndex(0);
                        inputRef.current?.focus();
                      }}
                      className={`flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 transition-colors duration-(--motion-fast) ease-out-muvuca outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
                        isSelected
                          ? "bg-primary font-medium text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          swatchClassFor(tag.colorToken),
                        )}
                      />
                      <span>{tag.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Load error: between the tag row and the listbox, never inside
              it -- the listbox stays mounted so the Ações group can still
              show matches. */}
          {loadError && (
            <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/10 px-4 py-3">
              <p className="text-body-sm text-muted-foreground">
                {t.spotlight.loadFailed}
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="text-body-sm shrink-0 rounded-md border border-border px-2.5 py-1 font-medium text-foreground transition-colors duration-(--motion-fast) ease-out-muvuca outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
              >
                {t.spotlight.retry}
              </button>
            </div>
          )}

          {/* Empty state: same slot as the error above, never inside the
              listbox -- the listbox stays mounted since the Ações group can
              still hold keyword matches even with zero items. */}
          {showEmptyState && (
            <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/10 px-4 py-3">
              <p className="text-body-sm text-muted-foreground">
                {t.spotlight.noItems(emptyStateSubject)}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="text-body-sm rounded-md border border-border px-2.5 py-1 font-medium text-foreground transition-colors duration-(--motion-fast) ease-out-muvuca outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                >
                  {t.spotlight.clearSearch}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    quickActions
                      .find((action) => action.id === "action-create-item")
                      ?.run()
                  }
                  className="text-body-sm rounded-md bg-primary px-2.5 py-1 font-medium text-primary-foreground transition-colors duration-(--motion-fast) ease-out-muvuca outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                >
                  {t.spotlight.quickActions.createItem.title}
                </button>
              </div>
            </div>
          )}

          {/* Results List */}
          <div
            ref={listRef}
            className="max-h-[50vh] overflow-y-auto p-2 sm:max-h-[60vh]"
            role="listbox"
            id={listboxId}
          >
            {optionBlocks.map((block, blockIdx) => {
              const headingId = `${listboxId}-heading-${blockIdx}`;
              const groupLabel =
                block.group === "actions"
                  ? t.spotlight.groups.actions
                  : block.group === "recent"
                    ? t.spotlight.groups.recent
                    : t.spotlight.groups.items;
              return (
                <div role="presentation" key={`${block.group}-${blockIdx}`}>
                  <div
                    id={headingId}
                    aria-hidden="true"
                    className="text-body-sm px-2.5 pt-2 pb-1 text-muted-foreground"
                  >
                    {groupLabel}
                  </div>
                  <div role="group" aria-labelledby={headingId}>
                    {block.entries.map(({ option, idx }) =>
                      renderOption(option, idx),
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer shortcuts hint */}
          <div className="text-metadata flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2.5 text-muted-foreground">
            <div
              id={footerLegendId}
              className="flex flex-wrap items-center gap-3"
            >
              <span>
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono">
                  ↑
                </kbd>{" "}
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono">
                  ↓
                </kbd>{" "}
                {t.spotlight.navigate}
              </span>
              <span>
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono">
                  ↵
                </kbd>{" "}
                {t.spotlight.select}
              </span>
              <span className="hidden sm:inline">
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono">
                  →
                </kbd>{" "}
                {t.spotlight.peek}
              </span>
              <span>
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono">
                  esc
                </kbd>{" "}
                {t.spotlight.close}
              </span>
            </div>

            {!stale && !isSearching && !loadError && (
              <span className="font-mono">
                {t.spotlight.itemCount(currentItems.length, freshHasMore)}
              </span>
            )}
          </div>
        </div>

        {/* Quick Look Preview Side Panel (Overdrive) */}
        {quickLookOpen && currentItem && (
          <div className="w-full shrink-0 sm:w-80">
            <QuickLookPreview
              item={currentItem}
              tags={tags}
              onClose={() => setQuickLookOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
