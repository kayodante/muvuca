"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";

import { Input } from "@/components/ui/input";

const emptySubscribe = () => () => {};

function getShortcutLabel() {
  if (typeof navigator === "undefined") return "⌘K";
  const isMac = /(Mac|iPhone|iPod|iPad)/i.test(
    navigator.userAgent || navigator.platform || "",
  );
  return isMac ? "⌘K" : "Ctrl+K";
}

/** Keeps the structural shell search in the URL without a full navigation. */
export function LibrarySearch() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [previousUrlQuery, setPreviousUrlQuery] = useState(urlQuery);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const shortcutLabel = useSyncExternalStore(
    emptySubscribe,
    getShortcutLabel,
    () => "⌘K",
  );

  if (urlQuery !== previousUrlQuery) {
    setPreviousUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        (event.key === "k" || event.key === "K")
      ) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      const normalized = query.trim();
      if (normalized === urlQuery) return;
      if (normalized) next.set("q", normalized);
      else next.delete("q");
      next.delete("cursor");
      const search = next.toString();
      const href = search ? `${pathname}?${search}` : pathname;
      startTransition(() => router.replace(href, { scroll: false }));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [params, pathname, query, router, urlQuery]);

  function handleClear() {
    setQuery("");
    const next = new URLSearchParams(params.toString());
    next.delete("q");
    next.delete("cursor");
    const search = next.toString();
    const href = search ? `${pathname}?${search}` : pathname;
    startTransition(() => router.replace(href, { scroll: false }));
    inputRef.current?.focus();
  }

  return (
    <div className="relative w-full max-w-lg" aria-busy={isPending}>
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        ref={inputRef}
        type="search"
        dir="auto"
        maxLength={240}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar na biblioteca"
        aria-label="Buscar na biblioteca"
        className="bg-background pr-14 pl-9 dark:bg-background [&::-webkit-search-cancel-button]:hidden"
      />
      {query ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Limpar busca"
          className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors duration-(--motion-fast) ease-out-muvuca outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          <XIcon aria-hidden="true" className="size-3.5" />
        </button>
      ) : (
        <kbd
          aria-hidden="true"
          className="text-metadata pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-border/80 bg-muted/60 px-1.5 py-0.5 font-mono text-muted-foreground select-none"
        >
          {shortcutLabel}
        </kbd>
      )}
      {isPending && (
        <>
          {/* A hairline under the field, not a spinner: search runs on every
              keystroke, so the indicator has to stay out of the way while
              still saying the results are catching up. */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-px rounded-full bg-primary motion-safe:animate-search-sweep"
          />
          <span className="sr-only">Pesquisando…</span>
        </>
      )}
    </div>
  );
}
