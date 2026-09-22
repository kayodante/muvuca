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
import { toast } from "sonner";

import type { LibraryItemSummary } from "@/lib/database/queries/items";
import type { FlatTag } from "@/lib/tags/tree";
import type { Tag } from "@/lib/database/queries/tags";
import { swatchClassFor } from "@/lib/tags/colors";
import { copyToClipboard } from "@/lib/clipboard";
import { getItemDetails } from "@/lib/actions/items";
import { normalizeHttpUrl } from "@/lib/validation/item";
import {
  getSpotlightInitialData,
  searchSpotlightItems,
} from "@/lib/actions/spotlight";
import { setTheme } from "@/lib/actions/theme";
import { useSpotlight } from "./SpotlightContext";
import { QuickLookPreview } from "./QuickLookPreview";
import { cn } from "@/lib/utils";

type QuickAction = {
  id: string;
  kind: "action";
  title: string;
  description: string;
  icon: typeof PlusIcon;
  keywords: string[];
  run: () => void;
};

type OptionItem =
  | { kind: "action"; action: QuickAction }
  | { kind: "item"; item: LibraryItemSummary };

interface MuvucaSpotlightProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialTags?: (FlatTag | Tag)[];
}

export function MuvucaSpotlight({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  initialTags = [],
}: MuvucaSpotlightProps) {
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
  const [items, setItems] = useState<LibraryItemSummary[]>([]);
  const [tags, setTags] = useState<(FlatTag | Tag)[]>(initialTags);
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

  const listboxId = useId();
  const optionId = useCallback(
    (index: number) => `${listboxId}-option-${index}`,
    [listboxId],
  );

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && !mounted) setMounted(true);
    if (!open && entered) setEntered(false);
  }
  const closing = !open && mounted;

  useEffect(() => {
    if (!open || !mounted) return;
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

  // Load initial data and debounced search without race conditions
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    const requestId = ++latestRequestIdRef.current;

    if (!trimmed && !selectedTagFilter) {
      getSpotlightInitialData()
        .then((res) => {
          if (requestId === latestRequestIdRef.current && res.ok) {
            setItems(res.data.items);
            if (res.data.tags.length > 0) {
              setTags(res.data.tags);
            }
          }
        })
        .catch(() => {});
      return;
    }

    const timeout = window.setTimeout(() => {
      startSearchTransition(async () => {
        const res = await searchSpotlightItems(trimmed, selectedTagFilter);
        if (requestId === latestRequestIdRef.current && res.ok) {
          setItems(res.data.items);
          if (res.data.tags.length > 0) {
            setTags(res.data.tags);
          }
        }
      });
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [open, query, selectedTagFilter]);

  // System quick actions
  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: "action-create-item",
        kind: "action",
        title: "Criar novo item",
        description: "Adicionar link, prompt ou código à biblioteca",
        icon: PlusIcon,
        keywords: [
          "novo",
          "criar",
          "adicionar",
          "salvar",
          "link",
          "prompt",
          "code",
        ],
        run: () => {
          onOpenChange(false);
          router.push("/library?create=1");
        },
      },
      {
        id: "action-goto-library",
        kind: "action",
        title: "Ir para Biblioteca",
        description: "Visualizar e navegar por todos os itens salvos",
        icon: LibraryIcon,
        keywords: ["biblioteca", "itens", "todos", "home", "galeria"],
        run: () => {
          onOpenChange(false);
          router.push("/library");
        },
      },
      {
        id: "action-goto-tags",
        kind: "action",
        title: "Gerenciar tags",
        description: "Organizar hierarquia e cores das tags",
        icon: TagIcon,
        keywords: ["tag", "tags", "etiquetas", "categorias"],
        run: () => {
          onOpenChange(false);
          router.push("/tags");
        },
      },
      {
        id: "action-goto-settings",
        kind: "action",
        title: "Configurações",
        description: "Exportar dados, backup e preferências da conta",
        icon: SettingsIcon,
        keywords: ["configurações", "ajustes", "backup", "exportar", "conta"],
        run: () => {
          onOpenChange(false);
          router.push("/settings");
        },
      },
      {
        id: "action-toggle-theme",
        kind: "action",
        title: "Alternar tema (Claro / Escuro / Sistema)",
        description: "Mudar a aparência da interface",
        icon: SunMoonIcon,
        keywords: [
          "tema",
          "escuro",
          "claro",
          "dark",
          "light",
          "aparência",
          "modo",
        ],
        run: () => {
          const isDark =
            document.documentElement.classList.contains("dark") ||
            document.documentElement.dataset.theme === "dark";
          const next = isDark ? "light" : "dark";
          void setTheme(next).then((res) => {
            if (res.ok) {
              toast.success(
                `Tema alterado para ${next === "dark" ? "escuro" : "claro"}.`,
              );
            }
          });
          onOpenChange(false);
        },
      },
    ],
    [router, onOpenChange],
  );

  // Filter actions and items
  const flatOptions: OptionItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();

    // Match actions
    const matchedActions = quickActions.filter((a) => {
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.keywords.some((kw) => kw.includes(q))
      );
    });

    const result: OptionItem[] = [];

    // Include actions
    for (const action of matchedActions) {
      result.push({ kind: "action", action });
    }

    // Include library items (already searched/filtered on server via Postgres search_library)
    for (const item of items) {
      result.push({ kind: "item", item });
    }

    return result;
  }, [query, quickActions, items]);

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

  async function handleAction(option: OptionItem) {
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
        toast.error("URL inválida ou insegura.");
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
        toast.success(
          item.type === "prompt"
            ? "Prompt copiado para a área de transferência."
            : "Código copiado para a área de transferência.",
        );
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        toast.error("Não foi possível copiar o conteúdo.");
      }
    }
  }

  // Keyboard navigation within list
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < flatOptions.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : flatOptions.length - 1,
      );
    } else if (e.key === "Enter" && flatOptions[safeSelectedIndex]) {
      e.preventDefault();
      handleAction(flatOptions[safeSelectedIndex]);
    } else if (
      (e.key === " " && query === "") ||
      (e.key === " " && (e.ctrlKey || e.metaKey || e.altKey))
    ) {
      // Spacebar toggles Quick Look preview when not actively typing query
      if (currentItem) {
        e.preventDefault();
        setQuickLookOpen((prev) => !prev);
      }
    }
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
        aria-label="Muvuca Spotlight — Busca rápida"
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
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="Buscar links, prompts, código ou ações..."
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
          {tags.length > 0 && (
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
                Todas
              </button>
              {tags.slice(0, 8).map((tag) => {
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
          )}

          {/* Results List */}
          <div
            ref={listRef}
            className="max-h-[50vh] overflow-y-auto p-2 sm:max-h-[60vh]"
            role="listbox"
            id={listboxId}
          >
            {flatOptions.length === 0 ? (
              <div className="text-body-sm py-12 text-center text-muted-foreground">
                Nenhum resultado encontrado para &quot;{query}&quot;.
              </div>
            ) : (
              flatOptions.map((option, idx) => {
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
                          <span className="text-body-sm truncate font-medium text-foreground">
                            {action.title}
                          </span>
                          <p className="text-metadata truncate text-muted-foreground">
                            {action.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 pl-3">
                        <span className="text-metadata hidden text-muted-foreground group-hover:text-foreground sm:inline">
                          Executar
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
                  item.description ||
                  ("contentPreview" in item ? item.contentPreview : "");

                return (
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
                  <div
                    key={item.id}
                    id={optionId(idx)}
                    role="option"
                    aria-selected={isSelected}
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
                        {isLink && (
                          <LinkIcon className="size-4" aria-hidden="true" />
                        )}
                        {isPrompt && (
                          <FileTextIcon className="size-4" aria-hidden="true" />
                        )}
                        {isCode && (
                          <Code2Icon className="size-4" aria-hidden="true" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-body-sm truncate font-medium text-foreground">
                            {item.title}
                          </span>
                          <span className="text-metadata shrink-0 font-mono text-muted-foreground uppercase">
                            {isLink
                              ? domain
                              : isPrompt
                                ? "PROMPT"
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
                      {/* Quick Look peek button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIndex(idx);
                          setQuickLookOpen((prev) => !prev);
                        }}
                        className={cn(
                          "rounded p-1 text-muted-foreground transition-colors hover:text-foreground",
                          quickLookOpen && isSelected && "text-primary",
                        )}
                        aria-label="Espiar item (Quick Look)"
                        title="Espiar item (Espaço)"
                      >
                        <EyeIcon className="size-3.5" />
                      </button>

                      {isLink ? (
                        <span className="text-metadata hidden items-center gap-1 text-muted-foreground group-hover:text-foreground sm:inline-flex">
                          <span>Abrir</span>
                          <ExternalLinkIcon className="size-3" />
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(option);
                          }}
                          className="text-metadata inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-1 text-foreground transition-colors duration-(--motion-fast) ease-out-muvuca group-hover:bg-primary group-hover:text-primary-foreground motion-reduce:transition-none"
                          aria-label={
                            isPrompt ? "Copiar prompt" : "Copiar código"
                          }
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
            <div className="flex flex-wrap items-center gap-3">
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
              <span className="hidden sm:inline">
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono">
                  espaço
                </kbd>{" "}
                espiar
              </span>
              <span>
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono">
                  esc
                </kbd>{" "}
                fechar
              </span>
            </div>

            <span className="font-mono">
              {flatOptions.length}{" "}
              {flatOptions.length === 1 ? "resultado" : "resultados"}
            </span>
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
