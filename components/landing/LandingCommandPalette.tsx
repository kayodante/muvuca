"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  SearchIcon,
  LinkIcon,
  FileTextIcon,
  ExternalLinkIcon,
  CheckIcon,
  CopyIcon,
  XIcon,
  CornerDownLeftIcon,
} from "lucide-react";
import { DEMO_ITEMS, DEMO_TAGS, type DemoItem } from "@/lib/landing/demo-data";
import { swatchClassFor } from "@/lib/tags/colors";
import { copyToClipboard } from "@/lib/clipboard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LandingCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LandingCommandPalette({
  open,
  onOpenChange,
}: LandingCommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(
    null,
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);
  const prevOpenRef = useRef(open);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  if (open !== prevOpenRef.current) {
    prevOpenRef.current = open;
    if (open && !mounted) setMounted(true);
    if (!open && entered) setEntered(false);
  }
  const closing = !open && mounted;

  useEffect(() => {
    if (!open || !mounted) return;
    const frame = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(frame);
  }, [open, mounted]);

  // Keep the dialog mounted long enough to play its exit animation
  // instead of vanishing instantly on close.
  useEffect(() => {
    if (!closing) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const closeDuration = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--modal-close-dur",
      ),
    );
    const closeDelay = Number.isFinite(closeDuration) ? closeDuration : 150;
    const timer = window.setTimeout(
      () => setMounted(false),
      reducedMotion ? 0 : closeDelay,
    );
    return () => clearTimeout(timer);
  }, [closing]);

  // Global shortcut ⌘K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Filter items
  const filteredItems = useMemo(() => {
    let list = DEMO_ITEMS;

    if (selectedTagFilter) {
      list = list.filter((item) => item.tagIds.includes(selectedTagFilter));
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.contentPreview?.toLowerCase().includes(q) ||
          item.url?.toLowerCase().includes(q),
      );
    }

    return list;
  }, [query, selectedTagFilter]);

  // Clamp selected index during render
  const safeSelectedIndex =
    filteredItems.length > 0
      ? Math.min(selectedIndex, filteredItems.length - 1)
      : 0;

  // Keyboard navigation within list
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredItems.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredItems.length - 1,
      );
    } else if (e.key === "Enter" && filteredItems[safeSelectedIndex]) {
      e.preventDefault();
      handleAction(filteredItems[safeSelectedIndex]);
    }
  }

  async function handleAction(item: DemoItem) {
    if (item.type === "link" && item.url) {
      window.open(item.url, "_blank", "noopener,noreferrer");
      onOpenChange(false);
    } else if (item.type === "prompt" && item.contentPreview) {
      const ok = await copyToClipboard(item.contentPreview);
      if (ok) {
        setCopiedId(item.id);
        toast.success("Prompt copiado para a área de transferência.");
        setTimeout(() => setCopiedId(null), 2000);
      }
    }
  }

  if (!mounted) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-xs transition-opacity duration-(--motion-fast) motion-reduce:transition-none",
        closing ? "animate-out fade-out" : "animate-in fade-in",
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Busca rápida na biblioteca de demonstração"
    >
      <div
        className={cn(
          "t-modal relative flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-2xl",
          closing ? "is-closing" : entered ? "is-open" : undefined,
        )}
      >
        {/* Header Search Bar */}
        <div className="flex items-center gap-3 border-b border-border bg-muted/20 px-4 py-3.5">
          <SearchIcon
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Buscar links, prompts, domínios ou tags..."
            className="text-body-md w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Digitar busca"
          />

          <div className="flex items-center gap-2">
            <span className="text-brand-pixel hidden rounded-md bg-primary/10 px-2 py-0.5 text-primary sm:inline">
              MUVUCA SPOTLIGHT
            </span>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Fechar busca rápida"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        </div>

        {/* Tag quick filters */}
        <div className="text-metadata flex items-center gap-1.5 overflow-x-auto border-b border-border bg-muted/10 px-4 py-2">
          <span className="mr-1 shrink-0 text-muted-foreground">
            Filtrar por tag:
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedTagFilter(null);
              setSelectedIndex(0);
            }}
            className={`shrink-0 rounded-md px-2 py-0.5 transition-colors duration-(--motion-fast) ease-out-muvuca motion-reduce:transition-none ${
              selectedTagFilter === null
                ? "bg-primary font-medium text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Todas ({DEMO_ITEMS.length})
          </button>
          {DEMO_TAGS.slice(0, 5).map((tag) => {
            const isSelected = selectedTagFilter === tag.id;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => {
                  setSelectedTagFilter(isSelected ? null : tag.id);
                  setSelectedIndex(0);
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 transition-colors duration-(--motion-fast) ease-out-muvuca motion-reduce:transition-none ${
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

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto p-2"
          role="listbox"
        >
          {filteredItems.length === 0 ? (
            <div className="text-body-sm py-12 text-center text-muted-foreground">
              Nenhum item encontrado para &quot;{query}&quot;.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === safeSelectedIndex;
              const domain =
                item.type === "link" && item.url
                  ? new URL(item.url).hostname
                  : null;

              return (
                <div
                  key={item.id}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => handleAction(item)}
                  className={`group flex cursor-pointer items-center justify-between rounded-lg p-3 transition-colors duration-(--motion-fast) ease-out-muvuca ${
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
                      {item.type === "link" ? (
                        <LinkIcon className="size-4" aria-hidden="true" />
                      ) : (
                        <FileTextIcon className="size-4" aria-hidden="true" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-body-sm truncate font-medium text-foreground">
                          {item.title}
                        </span>
                        <span className="text-metadata shrink-0 font-mono text-muted-foreground">
                          {item.type === "link" ? domain : "PROMPT"}
                        </span>
                      </div>
                      <p className="text-metadata truncate text-muted-foreground">
                        {item.description || item.contentPreview}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 pl-3">
                    {item.type === "link" ? (
                      <span className="text-metadata hidden items-center gap-1 text-muted-foreground group-hover:text-foreground sm:inline-flex">
                        <span>Abrir</span>
                        <ExternalLinkIcon className="size-3" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction(item);
                        }}
                        className="text-metadata inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-1 text-foreground transition-colors duration-(--motion-fast) ease-out-muvuca group-hover:bg-primary group-hover:text-primary-foreground motion-reduce:transition-none"
                        aria-label="Copiar prompt"
                      >
                        {copiedId === item.id ? (
                          <>
                            <CheckIcon className="size-3" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <CopyIcon className="size-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
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
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="text-metadata flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2.5 text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono">
                ↑
              </kbd>{" "}
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono">
                ↓
              </kbd>{" "}
              navegar
            </span>
            <span>
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono">
                ↵
              </kbd>{" "}
              selecionar
            </span>
            <span>
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono">
                esc
              </kbd>{" "}
              fechar
            </span>
          </div>

          <span className="font-mono">
            {filteredItems.length}{" "}
            {filteredItems.length === 1 ? "item" : "itens"}
          </span>
        </div>
      </div>
    </div>
  );
}
